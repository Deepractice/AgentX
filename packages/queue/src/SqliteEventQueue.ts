/**
 * SqliteEventQueue - SQLite-based persistent event queue with multi-consumer support
 */

import type {
  EventQueue,
  QueueEntry,
  QueueOptions,
  MessageSender,
  Unsubscribe,
  QueueSubscribeRequest,
  QueueAckRequest,
  QueueUnsubscribeRequest,
} from "@agentxjs/types/queue";
import { createLogger } from "@agentxjs/common";
import { CursorGenerator } from "./CursorGenerator";

const logger = createLogger("queue/SqliteEventQueue");

declare const Bun: unknown;

interface ResolvedOptions {
  path: string;
  consumerTtlMs: number;
  messageTtlMs: number;
  maxEntriesPerTopic: number;
  cleanupIntervalMs: number;
}

/**
 * Consumer subscription info (in-memory)
 */
interface ConsumerSubscription {
  consumerId: string;
  topic: string;
  handler: (entry: QueueEntry) => void;
}

/**
 * SqliteEventQueue implementation
 */
export class SqliteEventQueue implements EventQueue {
  private db: any;
  private readonly cursorGen = new CursorGenerator();
  private readonly subscribers = new Map<string, ConsumerSubscription>();
  private readonly options: ResolvedOptions;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private constructor(db: any, options: ResolvedOptions) {
    this.db = db;
    this.options = options;

    if (this.options.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch((err) => {
          logger.error("Cleanup failed", { error: err.message });
        });
      }, this.options.cleanupIntervalMs);
    }
  }

  /**
   * Create a new SqliteEventQueue instance
   */
  static async create(options: QueueOptions): Promise<SqliteEventQueue> {
    const resolvedOptions: ResolvedOptions = {
      path: options.path,
      consumerTtlMs: options.consumerTtlMs ?? 86400000, // 24 hours
      messageTtlMs: options.messageTtlMs ?? 172800000, // 48 hours
      maxEntriesPerTopic: options.maxEntriesPerTopic ?? 10000,
      cleanupIntervalMs: options.cleanupIntervalMs ?? 300000,
    };

    const { createDatabase } = await import("db0");
    const connector = await getSqliteConnector(resolvedOptions.path);
    const db = createDatabase(connector);

    await initializeSchema(db);

    logger.info("SqliteEventQueue created", { path: resolvedOptions.path });
    return new SqliteEventQueue(db, resolvedOptions);
  }

  async append(topic: string, event: unknown): Promise<string> {
    const cursor = this.cursorGen.generate();
    const timestamp = Date.now();
    const eventJson = JSON.stringify(event);

    await this.db.sql`
      INSERT INTO queue_entries (cursor, topic, event, timestamp)
      VALUES (${cursor}, ${topic}, ${eventJson}, ${timestamp})
    `;

    // Notify in-memory subscribers for this topic
    const entry: QueueEntry = {
      cursor,
      topic,
      event,
      timestamp,
    };

    for (const sub of this.subscribers.values()) {
      if (sub.topic === topic) {
        try {
          sub.handler(entry);
        } catch (err) {
          logger.error("Subscriber handler error", {
            consumerId: sub.consumerId,
            error: (err as Error).message,
          });
        }
      }
    }

    return cursor;
  }

  async createConsumer(consumerId: string, topic: string): Promise<void> {
    const now = Date.now();

    // Use INSERT OR REPLACE to handle reconnection with same clientId
    await this.db.sql`
      INSERT OR REPLACE INTO queue_subscriptions (consumerId, topic, cursor, createdAt, updatedAt)
      VALUES (
        ${consumerId},
        ${topic},
        COALESCE((SELECT cursor FROM queue_subscriptions WHERE consumerId = ${consumerId} AND topic = ${topic}), NULL),
        COALESCE((SELECT createdAt FROM queue_subscriptions WHERE consumerId = ${consumerId} AND topic = ${topic}), ${now}),
        ${now}
      )
    `;

    logger.debug("Consumer created/updated", { consumerId, topic });
  }

  async read(consumerId: string, topic: string, limit: number = 100): Promise<QueueEntry[]> {
    // Get consumer's current cursor
    const cursorResult = await this.db.sql`
      SELECT cursor FROM queue_subscriptions
      WHERE consumerId = ${consumerId} AND topic = ${topic}
    `;

    if (cursorResult.rows.length === 0) {
      throw new Error(`Consumer not found: ${consumerId} for topic: ${topic}`);
    }

    const consumerCursor = cursorResult.rows[0].cursor;

    // Read entries after consumer's cursor
    let result: { rows: any[] };
    if (consumerCursor) {
      result = await this.db.sql`
        SELECT cursor, topic, event, timestamp
        FROM queue_entries
        WHERE topic = ${topic} AND cursor > ${consumerCursor}
        ORDER BY cursor ASC
        LIMIT ${limit}
      `;
    } else {
      // Consumer hasn't consumed anything yet, read from beginning
      result = await this.db.sql`
        SELECT cursor, topic, event, timestamp
        FROM queue_entries
        WHERE topic = ${topic}
        ORDER BY cursor ASC
        LIMIT ${limit}
      `;
    }

    return result.rows.map((row) => ({
      cursor: row.cursor,
      topic: row.topic,
      event: JSON.parse(row.event),
      timestamp: row.timestamp,
    }));
  }

  async ack(consumerId: string, topic: string, cursor: string): Promise<void> {
    const now = Date.now();

    await this.db.sql`
      UPDATE queue_subscriptions
      SET cursor = ${cursor}, updatedAt = ${now}
      WHERE consumerId = ${consumerId} AND topic = ${topic}
    `;

    logger.debug("Consumer acknowledged", { consumerId, topic, cursor });
  }

  subscribe(consumerId: string, topic: string, handler: (entry: QueueEntry) => void): Unsubscribe {
    const key = `${consumerId}:${topic}`;

    if (this.subscribers.has(key)) {
      logger.warn("Consumer already subscribed, replacing handler", { consumerId, topic });
    }

    this.subscribers.set(key, { consumerId, topic, handler });

    logger.debug("Consumer subscribed", { consumerId, topic });

    return () => {
      this.subscribers.delete(key);
      logger.debug("Consumer unsubscribed", { consumerId, topic });
    };
  }

  async getConsumerCursor(consumerId: string, topic: string): Promise<string | null> {
    const result = await this.db.sql`
      SELECT cursor FROM queue_subscriptions
      WHERE consumerId = ${consumerId} AND topic = ${topic}
    `;

    return result.rows.length > 0 ? result.rows[0].cursor : null;
  }

  async deleteConsumer(consumerId: string, topic: string): Promise<void> {
    await this.db.sql`
      DELETE FROM queue_subscriptions
      WHERE consumerId = ${consumerId} AND topic = ${topic}
    `;

    // Remove from in-memory subscribers
    const key = `${consumerId}:${topic}`;
    this.subscribers.delete(key);

    logger.debug("Consumer deleted", { consumerId, topic });
  }

  async cleanup(): Promise<number> {
    let totalCleaned = 0;
    const now = Date.now();

    // Step 1: Clean up stale consumers (Consumer TTL)
    const consumerCutoff = now - this.options.consumerTtlMs;
    const staleConsumersResult = await this.db.sql`
      DELETE FROM queue_subscriptions
      WHERE updatedAt < ${consumerCutoff}
    `;
    const staleConsumers = staleConsumersResult.changes ?? 0;
    if (staleConsumers > 0) {
      logger.debug("Cleaned up stale consumers", {
        count: staleConsumers,
        ttlMs: this.options.consumerTtlMs,
      });
    }

    // Step 2: Force delete expired messages (Message TTL - ultimate fallback)
    const messageCutoff = now - this.options.messageTtlMs;
    const expiredMessagesResult = await this.db.sql`
      DELETE FROM queue_entries
      WHERE timestamp < ${messageCutoff}
    `;
    const expiredMessages = expiredMessagesResult.changes ?? 0;
    if (expiredMessages > 0) {
      logger.debug("Cleaned up expired messages", {
        count: expiredMessages,
        ttlMs: this.options.messageTtlMs,
      });
      totalCleaned += expiredMessages;
    }

    // Step 3: Clean up messages based on MIN(cursor) per topic
    const topicsResult = await this.db.sql`
      SELECT DISTINCT topic FROM queue_entries
    `;

    for (const topicRow of topicsResult.rows) {
      const topic = topicRow.topic;

      // Get all consumer cursors for this topic
      const cursorsResult = await this.db.sql`
        SELECT cursor FROM queue_subscriptions
        WHERE topic = ${topic} AND cursor IS NOT NULL
      `;

      if (cursorsResult.rows.length === 0) {
        // No active consumers for this topic - messages will be cleaned by TTL
        continue;
      }

      // Find MIN cursor (using CursorGenerator.compare)
      const cursors = cursorsResult.rows.map((r: any) => r.cursor);
      let minCursor = cursors[0];
      for (const cursor of cursors) {
        if (CursorGenerator.compare(cursor, minCursor) < 0) {
          minCursor = cursor;
        }
      }

      // Delete entries before or at min cursor (all consumers consumed it)
      const entriesToDelete = await this.db.sql`
        SELECT cursor FROM queue_entries
        WHERE topic = ${topic}
      `;

      let deleted = 0;
      for (const entryRow of entriesToDelete.rows) {
        if (CursorGenerator.compare(entryRow.cursor, minCursor) <= 0) {
          await this.db.sql`
            DELETE FROM queue_entries
            WHERE cursor = ${entryRow.cursor}
          `;
          deleted++;
        }
      }

      if (deleted > 0) {
        logger.debug("Cleaned up consumed entries for topic", { topic, minCursor, count: deleted });
        totalCleaned += deleted;
      }
    }

    return totalCleaned;
  }

  handleConnection(sender: MessageSender): Unsubscribe {
    const subscriptions = new Map<string, Unsubscribe>();

    // Register message handler for queue protocol messages
    const unsubscribeMessage = sender.onMessage((message: string) => {
      try {
        const parsed = JSON.parse(message);

        if (parsed.type === "queue_subscribe") {
          this.handleSubscribe(sender, parsed as QueueSubscribeRequest, subscriptions);
        } else if (parsed.type === "queue_ack") {
          this.handleAck(parsed as QueueAckRequest);
        } else if (parsed.type === "queue_unsubscribe") {
          this.handleUnsubscribe(parsed as QueueUnsubscribeRequest, subscriptions);
        }
        // Ignore other message types - not queue protocol
      } catch {
        // Ignore parse errors - not a queue protocol message
      }
    });

    // Cleanup function
    const cleanup = () => {
      // Cleanup all subscriptions for this connection
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe();
      }
      subscriptions.clear();
      logger.debug("Connection cleanup completed", { senderId: sender.id });
    };

    // Register close handler for auto cleanup
    const unsubscribeClose = sender.onClose(cleanup);

    logger.debug("Connection handler registered", { senderId: sender.id });

    // Return cleanup function
    return () => {
      cleanup();
      unsubscribeMessage();
      unsubscribeClose();
    };
  }

  private async handleSubscribe(
    sender: MessageSender,
    request: QueueSubscribeRequest,
    subscriptions: Map<string, Unsubscribe>
  ): Promise<void> {
    const { topic, clientId, afterCursor } = request;
    const consumerId = clientId;

    // Create or update consumer
    await this.createConsumer(consumerId, topic);

    // Unsubscribe from previous subscription to same topic (if any)
    const existingKey = `${consumerId}:${topic}`;
    subscriptions.get(existingKey)?.();

    // Send historical entries if afterCursor provided (reconnection recovery)
    // Otherwise send all entries from beginning
    let missed: QueueEntry[];
    if (afterCursor) {
      // Read entries after the provided cursor
      const cursorResult = await this.db.sql`
        SELECT cursor, topic, event, timestamp
        FROM queue_entries
        WHERE topic = ${topic} AND cursor > ${afterCursor}
        ORDER BY cursor ASC
        LIMIT 1000
      `;
      missed = cursorResult.rows.map((row: any) => ({
        cursor: row.cursor,
        topic: row.topic,
        event: JSON.parse(row.event),
        timestamp: row.timestamp,
      }));
    } else {
      // Read all entries for this topic
      missed = await this.read(consumerId, topic, 1000);
    }

    // Send missed entries
    for (const entry of missed) {
      sender.send(
        JSON.stringify({
          type: "queue_entry",
          topic: entry.topic,
          cursor: entry.cursor,
          event: entry.event,
          timestamp: entry.timestamp,
        })
      );
    }

    // Subscribe to new entries
    const unsubscribe = this.subscribe(consumerId, topic, (entry) => {
      sender.send(
        JSON.stringify({
          type: "queue_entry",
          topic: entry.topic,
          cursor: entry.cursor,
          event: entry.event,
          timestamp: entry.timestamp,
        })
      );
    });

    subscriptions.set(existingKey, unsubscribe);

    // Get latest cursor for confirmation
    const latestEntry = await this.db.sql`
      SELECT cursor FROM queue_entries
      WHERE topic = ${topic}
      ORDER BY cursor DESC
      LIMIT 1
    `;
    const latestCursor = latestEntry.rows.length > 0 ? latestEntry.rows[0].cursor : null;

    // Send confirmation
    sender.send(
      JSON.stringify({
        type: "queue_subscribed",
        topic,
        latestCursor,
      })
    );

    logger.debug("Client subscribed to queue", {
      senderId: sender.id,
      consumerId,
      topic,
      afterCursor,
      missedCount: missed.length,
    });
  }

  private async handleAck(request: QueueAckRequest): Promise<void> {
    const { topic, clientId, cursor } = request;
    await this.ack(clientId, topic, cursor);
  }

  private handleUnsubscribe(
    request: QueueUnsubscribeRequest,
    subscriptions: Map<string, Unsubscribe>
  ): void {
    const { topic, clientId } = request;
    const key = `${clientId}:${topic}`;

    subscriptions.get(key)?.();
    subscriptions.delete(key);

    logger.debug("Client unsubscribed from queue", { clientId, topic });
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.subscribers.clear();
    logger.info("SqliteEventQueue closed");
  }
}

/**
 * Initialize database schema
 */
async function initializeSchema(db: any): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS queue_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cursor TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queue_topic_cursor ON queue_entries(topic, cursor);

    CREATE TABLE IF NOT EXISTS queue_subscriptions (
      consumerId TEXT NOT NULL,
      topic TEXT NOT NULL,
      cursor TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (consumerId, topic)
    );

    CREATE INDEX IF NOT EXISTS idx_queue_sub_topic ON queue_subscriptions(topic);
    CREATE INDEX IF NOT EXISTS idx_queue_sub_cursor ON queue_subscriptions(topic, cursor);
  `);
  logger.debug("Queue database schema initialized");
}

/**
 * Detect runtime and return appropriate SQLite connector
 */
async function getSqliteConnector(path: string) {
  // Bun runtime - use bun:sqlite (built-in)
  if (typeof Bun !== "undefined") {
    const { default: bunSqliteConnector } = await import("db0/connectors/bun-sqlite");
    return bunSqliteConnector({ path });
  }

  // Node.js 22+ - use built-in node:sqlite
  const nodeSqlite = globalThis.process?.getBuiltinModule?.("node:sqlite");
  if (nodeSqlite) {
    // @ts-expect-error - db0 connector types not fully exported
    const { default: nodeSqliteConnector } = await import("db0/connectors/node-sqlite");
    return nodeSqliteConnector({ path });
  }

  throw new Error("No SQLite driver available. Requires Bun runtime or Node.js 22+.");
}
