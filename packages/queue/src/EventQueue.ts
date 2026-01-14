/**
 * EventQueue - RxJS-based event queue with SQLite persistence
 *
 * - In-memory pub/sub using RxJS Subject (real-time, fast)
 * - SQLite persistence for recovery guarantee (async, non-blocking)
 * - Consumer cursor tracking for at-least-once delivery
 */

import { Subject } from "rxjs";
import { filter } from "rxjs/operators";
import type {
  EventQueue as IEventQueue,
  QueueEntry,
  QueueOptions,
  Unsubscribe,
} from "@agentxjs/types/queue";
import { createLogger } from "@agentxjs/common";
import { openDatabase, type Database } from "@agentxjs/common/sqlite";
import { CursorGenerator } from "./CursorGenerator";

const logger = createLogger("queue/EventQueue");

interface ResolvedOptions {
  path: string;
  retentionMs: number;
  cleanupIntervalMs: number;
}

/**
 * EventQueue implementation
 */
export class EventQueue implements IEventQueue {
  private readonly subject = new Subject<QueueEntry>();
  private readonly cursorGen = new CursorGenerator();
  private readonly options: ResolvedOptions;
  private readonly db: Database;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private constructor(db: Database, options: ResolvedOptions) {
    this.db = db;
    this.options = options;

    if (this.options.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanupIntervalMs);
    }
  }

  /**
   * Create a new EventQueue instance
   */
  static create(options: QueueOptions): EventQueue {
    const resolvedOptions: ResolvedOptions = {
      path: options.path,
      retentionMs: options.retentionMs ?? 86400000, // 24 hours
      cleanupIntervalMs: options.cleanupIntervalMs ?? 300000, // 5 minutes
    };

    const db = openDatabase(resolvedOptions.path);
    initializeSchema(db);

    logger.info("EventQueue created", { path: resolvedOptions.path });
    return new EventQueue(db, resolvedOptions);
  }

  publish(topic: string, event: unknown): string {
    const cursor = this.cursorGen.generate();
    const timestamp = Date.now();

    const entry: QueueEntry = {
      cursor,
      topic,
      event,
      timestamp,
    };

    // 1. Broadcast to subscribers immediately (in-memory, sync)
    this.subject.next(entry);

    // 2. Persist asynchronously (non-blocking)
    this.persistAsync(entry);

    return cursor;
  }

  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe {
    const subscription = this.subject.pipe(filter((entry) => entry.topic === topic)).subscribe({
      next: (entry) => {
        try {
          handler(entry);
        } catch (err) {
          logger.error("Subscriber handler error", {
            topic,
            cursor: entry.cursor,
            error: (err as Error).message,
          });
        }
      },
    });

    logger.debug("Subscribed to topic", { topic });

    return () => {
      subscription.unsubscribe();
      logger.debug("Unsubscribed from topic", { topic });
    };
  }

  async ack(consumerId: string, topic: string, cursor: string): Promise<void> {
    const now = Date.now();

    // Check if consumer exists
    const existing = this.db
      .prepare("SELECT 1 FROM queue_consumers WHERE consumer_id = ? AND topic = ?")
      .get(consumerId, topic);

    if (existing) {
      this.db
        .prepare(
          "UPDATE queue_consumers SET cursor = ?, updated_at = ? WHERE consumer_id = ? AND topic = ?"
        )
        .run(cursor, now, consumerId, topic);
    } else {
      this.db
        .prepare(
          "INSERT INTO queue_consumers (consumer_id, topic, cursor, updated_at) VALUES (?, ?, ?, ?)"
        )
        .run(consumerId, topic, cursor, now);
    }

    logger.debug("Consumer acknowledged", { consumerId, topic, cursor });
  }

  async getCursor(consumerId: string, topic: string): Promise<string | null> {
    const row = this.db
      .prepare("SELECT cursor FROM queue_consumers WHERE consumer_id = ? AND topic = ?")
      .get(consumerId, topic) as { cursor: string } | undefined;

    return row?.cursor ?? null;
  }

  async recover(topic: string, afterCursor?: string, limit: number = 1000): Promise<QueueEntry[]> {
    let rows: any[];

    if (afterCursor) {
      rows = this.db
        .prepare(
          "SELECT cursor, topic, event, timestamp FROM queue_entries WHERE topic = ? AND cursor > ? ORDER BY cursor ASC LIMIT ?"
        )
        .all(topic, afterCursor, limit) as any[];
    } else {
      rows = this.db
        .prepare(
          "SELECT cursor, topic, event, timestamp FROM queue_entries WHERE topic = ? ORDER BY cursor ASC LIMIT ?"
        )
        .all(topic, limit) as any[];
    }

    return rows.map((row) => ({
      cursor: row.cursor,
      topic: row.topic,
      event: JSON.parse(row.event),
      timestamp: row.timestamp,
    }));
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.subject.complete();
    this.db.close();
    logger.info("EventQueue closed");
  }

  /**
   * Persist entry to SQLite asynchronously
   */
  private persistAsync(entry: QueueEntry): void {
    // Use setImmediate/setTimeout to make it non-blocking
    setImmediate(() => {
      try {
        const eventJson = JSON.stringify(entry.event);
        this.db
          .prepare(
            "INSERT INTO queue_entries (cursor, topic, event, timestamp) VALUES (?, ?, ?, ?)"
          )
          .run(entry.cursor, entry.topic, eventJson, entry.timestamp);
      } catch (err) {
        logger.error("Failed to persist entry", {
          cursor: entry.cursor,
          topic: entry.topic,
          error: (err as Error).message,
        });
      }
    });
  }

  /**
   * Cleanup old entries based on retention policy
   */
  private cleanup(): void {
    try {
      const cutoff = Date.now() - this.options.retentionMs;
      const result = this.db.prepare("DELETE FROM queue_entries WHERE timestamp < ?").run(cutoff);

      if (result.changes > 0) {
        logger.debug("Cleaned up old entries", {
          count: result.changes,
          retentionMs: this.options.retentionMs,
        });
      }
    } catch (err) {
      logger.error("Cleanup failed", { error: (err as Error).message });
    }
  }
}

/**
 * Initialize database schema
 */
function initializeSchema(db: Database): void {
  db.exec(`
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS queue_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cursor TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queue_topic_cursor ON queue_entries(topic, cursor);
    CREATE INDEX IF NOT EXISTS idx_queue_timestamp ON queue_entries(timestamp);

    CREATE TABLE IF NOT EXISTS queue_consumers (
      consumer_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      cursor TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (consumer_id, topic)
    );
  `);

  logger.debug("Queue database schema initialized");
}
