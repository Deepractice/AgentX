/**
 * SqliteMessageQueue - RxJS-based message queue with SQLite persistence
 *
 * - In-memory pub/sub using RxJS Subject (real-time)
 * - SQLite persistence for recovery guarantee
 * - Consumer offset tracking for at-least-once delivery
 */

import type { MessageQueue, QueueConfig, QueueEntry, Unsubscribe } from "@agentxjs/core/mq";
import { createLogger } from "commonxjs/logger";
import { type Database, openDatabase } from "commonxjs/sqlite";
import { Subject } from "rxjs";
import { filter } from "rxjs/operators";
import { OffsetGenerator } from "./OffsetGenerator";

const logger = createLogger("node-platform/SqliteMessageQueue");

interface ResolvedConfig {
  path: string;
  retentionMs: number;
  cleanupIntervalMs: number;
}

/**
 * SqliteMessageQueue implementation
 */
export class SqliteMessageQueue implements MessageQueue {
  private readonly subject = new Subject<QueueEntry>();
  private readonly offsetGen = new OffsetGenerator();
  private readonly config: ResolvedConfig;
  private readonly db: Database;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private isClosed = false;

  private constructor(db: Database, config: ResolvedConfig) {
    this.db = db;
    this.config = config;

    if (this.config.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupIntervalMs);
    }
  }

  /**
   * Create a new SqliteMessageQueue instance
   */
  static create(path: string, config?: QueueConfig): SqliteMessageQueue {
    const resolvedConfig: ResolvedConfig = {
      path,
      retentionMs: config?.retentionMs ?? 86400000, // 24 hours
      cleanupIntervalMs: 300000, // 5 minutes
    };

    const db = openDatabase(resolvedConfig.path);
    initializeSchema(db);

    logger.info("SqliteMessageQueue created", { path: resolvedConfig.path });
    return new SqliteMessageQueue(db, resolvedConfig);
  }

  async publish(topic: string, event: unknown): Promise<string> {
    if (this.isClosed) {
      logger.warn("Attempted to publish to closed queue", { topic });
      return "";
    }

    const offset = this.offsetGen.generate();
    const timestamp = Date.now();

    const entry: QueueEntry = {
      offset,
      topic,
      event,
      timestamp,
    };

    // 1. Persist to SQLite (sync, fast)
    try {
      const eventJson = JSON.stringify(entry.event);
      this.db
        .prepare("INSERT INTO queue_entries (offset, topic, event, timestamp) VALUES (?, ?, ?, ?)")
        .run(entry.offset, entry.topic, eventJson, entry.timestamp);
    } catch (err) {
      logger.error("Failed to persist entry", {
        offset: entry.offset,
        topic: entry.topic,
        error: (err as Error).message,
      });
    }

    // 2. Broadcast to subscribers (in-memory)
    this.subject.next(entry);

    return offset;
  }

  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe {
    const subscription = this.subject.pipe(filter((entry) => entry.topic === topic)).subscribe({
      next: (entry) => {
        try {
          handler(entry);
        } catch (err) {
          logger.error("Subscriber handler error", {
            topic,
            offset: entry.offset,
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

  async ack(consumerId: string, topic: string, offset: string): Promise<void> {
    const now = Date.now();

    // Check if consumer exists
    const existing = this.db
      .prepare("SELECT 1 FROM queue_consumers WHERE consumer_id = ? AND topic = ?")
      .get(consumerId, topic);

    if (existing) {
      this.db
        .prepare(
          "UPDATE queue_consumers SET offset = ?, updated_at = ? WHERE consumer_id = ? AND topic = ?"
        )
        .run(offset, now, consumerId, topic);
    } else {
      this.db
        .prepare(
          "INSERT INTO queue_consumers (consumer_id, topic, offset, updated_at) VALUES (?, ?, ?, ?)"
        )
        .run(consumerId, topic, offset, now);
    }

    logger.debug("Consumer acknowledged", { consumerId, topic, offset });
  }

  async getOffset(consumerId: string, topic: string): Promise<string | null> {
    const row = this.db
      .prepare("SELECT offset FROM queue_consumers WHERE consumer_id = ? AND topic = ?")
      .get(consumerId, topic) as { offset: string } | undefined;

    return row?.offset ?? null;
  }

  async recover(topic: string, afterOffset?: string, limit: number = 1000): Promise<QueueEntry[]> {
    let rows: { offset: string; topic: string; event: string; timestamp: number }[];

    if (afterOffset) {
      rows = this.db
        .prepare(
          "SELECT offset, topic, event, timestamp FROM queue_entries WHERE topic = ? AND offset > ? ORDER BY offset ASC LIMIT ?"
        )
        .all(topic, afterOffset, limit) as typeof rows;
    } else {
      rows = this.db
        .prepare(
          "SELECT offset, topic, event, timestamp FROM queue_entries WHERE topic = ? ORDER BY offset ASC LIMIT ?"
        )
        .all(topic, limit) as typeof rows;
    }

    return rows.map((row) => ({
      offset: row.offset,
      topic: row.topic,
      event: JSON.parse(row.event),
      timestamp: row.timestamp,
    }));
  }

  async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.subject.complete();
    this.db.close();
    logger.info("SqliteMessageQueue closed");
  }

  /**
   * Cleanup old entries based on retention policy
   */
  private cleanup(): void {
    try {
      const cutoff = Date.now() - this.config.retentionMs;
      const result = this.db.prepare("DELETE FROM queue_entries WHERE timestamp < ?").run(cutoff);

      if (result.changes > 0) {
        logger.debug("Cleaned up old entries", {
          count: result.changes,
          retentionMs: this.config.retentionMs,
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
      offset TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queue_topic_offset ON queue_entries(topic, offset);
    CREATE INDEX IF NOT EXISTS idx_queue_timestamp ON queue_entries(timestamp);

    CREATE TABLE IF NOT EXISTS queue_consumers (
      consumer_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      offset TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (consumer_id, topic)
    );
  `);

  logger.debug("Queue database schema initialized");
}
