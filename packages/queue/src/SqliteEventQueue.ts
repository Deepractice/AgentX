/**
 * SqliteEventQueue - SQLite-based persistent event queue with multi-consumer support
 */

import type { EventQueue, QueueEntry, QueueOptions } from "@agentxjs/types/queue";
import type { Unsubscribe } from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";
import { CursorGenerator } from "./CursorGenerator";
import { nanoid } from "nanoid";

const logger = createLogger("queue/SqliteEventQueue");

declare const Bun: unknown;

interface ResolvedOptions {
  path: string;
  ackRetentionMs: number;
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
      ackRetentionMs: options.ackRetentionMs ?? 3600000,
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

  async createConsumer(topic: string): Promise<string> {
    const consumerId = `consumer_${nanoid(12)}`;
    const now = Date.now();

    await this.db.sql`
      INSERT INTO queue_subscriptions (consumerId, topic, cursor, createdAt, updatedAt)
      VALUES (${consumerId}, ${topic}, NULL, ${now}, ${now})
    `;

    logger.debug("Consumer created", { consumerId, topic });
    return consumerId;
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

    // Get all topics
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
        // No consumers, clean up old entries
        const cutoff = Date.now() - this.options.ackRetentionMs;
        const orphanedResult = await this.db.sql`
          DELETE FROM queue_entries
          WHERE topic = ${topic} AND timestamp < ${cutoff}
        `;
        const cleaned = orphanedResult.changes ?? 0;
        if (cleaned > 0) {
          logger.debug("Cleaned up orphaned entries", { topic, count: cleaned });
          totalCleaned += cleaned;
        }
        continue;
      }

      // Find MIN cursor (using CursorGenerator.compare)
      const cursors = cursorsResult.rows.map((r) => r.cursor);
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
        logger.debug("Cleaned up entries for topic", { topic, minCursor, count: deleted });
        totalCleaned += deleted;
      }
    }

    return totalCleaned;
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
