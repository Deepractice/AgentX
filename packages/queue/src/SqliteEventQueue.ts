/**
 * SqliteEventQueue - SQLite-based persistent event queue
 */

import type { EventQueue, QueueEntry, QueueOptions } from "@agentxjs/types/queue";
import type { Unsubscribe } from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";
import { CursorGenerator } from "./CursorGenerator";

const logger = createLogger("queue/SqliteEventQueue");

declare const Bun: unknown;

interface ResolvedOptions {
  path: string;
  ackRetentionMs: number;
  maxEntriesPerTopic: number;
  cleanupIntervalMs: number;
}

/**
 * SqliteEventQueue implementation
 */
export class SqliteEventQueue implements EventQueue {
  private db: any;
  private readonly cursorGen = new CursorGenerator();
  private readonly subscribers = new Map<string, Set<(entry: QueueEntry) => void>>();
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
      INSERT INTO queue_entries (cursor, topic, event, timestamp, acknowledged)
      VALUES (${cursor}, ${topic}, ${eventJson}, ${timestamp}, 0)
    `;

    const entry: QueueEntry = {
      cursor,
      topic,
      event,
      timestamp,
      acknowledged: false,
      acknowledgedAt: null,
    };

    // Notify in-memory subscribers
    const subs = this.subscribers.get(topic);
    if (subs) {
      for (const handler of subs) {
        try {
          handler(entry);
        } catch (err) {
          logger.error("Subscriber handler error", { error: (err as Error).message });
        }
      }
    }

    return cursor;
  }

  async read(topic: string, afterCursor?: string, limit: number = 100): Promise<QueueEntry[]> {
    let result: { rows: any[] };

    if (afterCursor) {
      result = await this.db.sql`
        SELECT cursor, topic, event, timestamp, acknowledged, acknowledged_at
        FROM queue_entries
        WHERE topic = ${topic} AND cursor > ${afterCursor}
        ORDER BY cursor ASC
        LIMIT ${limit}
      `;
    } else {
      result = await this.db.sql`
        SELECT cursor, topic, event, timestamp, acknowledged, acknowledged_at
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
      acknowledged: Boolean(row.acknowledged),
      acknowledgedAt: row.acknowledged_at,
    }));
  }

  async ack(topic: string, cursor: string): Promise<void> {
    const now = Date.now();
    await this.db.sql`
      UPDATE queue_entries
      SET acknowledged = 1, acknowledged_at = ${now}
      WHERE topic = ${topic} AND cursor = ${cursor}
    `;
  }

  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);

    return () => {
      this.subscribers.get(topic)?.delete(handler);
    };
  }

  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.options.ackRetentionMs;

    // Get count before deletion for logging
    const countResult = await this.db.sql`
      SELECT COUNT(*) as count FROM queue_entries
      WHERE acknowledged = 1 AND acknowledged_at < ${cutoff}
    `;
    const count = countResult.rows[0]?.count ?? 0;

    if (count > 0) {
      await this.db.sql`
        DELETE FROM queue_entries
        WHERE acknowledged = 1 AND acknowledged_at < ${cutoff}
      `;
      logger.debug("Cleaned up acknowledged entries", { count });
    }

    return count;
  }

  async getLatestCursor(topic: string): Promise<string | null> {
    const result = await this.db.sql`
      SELECT cursor FROM queue_entries
      WHERE topic = ${topic}
      ORDER BY cursor DESC
      LIMIT 1
    `;

    return result.rows.length > 0 ? result.rows[0].cursor : null;
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
      timestamp INTEGER NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at INTEGER DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queue_topic_cursor ON queue_entries(topic, cursor);
    CREATE INDEX IF NOT EXISTS idx_queue_topic_ack ON queue_entries(topic, acknowledged, acknowledged_at);
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
