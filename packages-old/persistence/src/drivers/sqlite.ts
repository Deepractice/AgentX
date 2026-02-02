/**
 * SQLite Driver - SQLite database storage
 *
 * Uses @agentxjs/common SQLite abstraction with automatic runtime detection:
 * - Bun: uses bun:sqlite (built-in)
 * - Node.js 22+: uses node:sqlite (built-in)
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { sqliteDriver } from "@agentxjs/persistence/sqlite";
 *
 * const persistence = await createPersistence(
 *   sqliteDriver({ path: "./data/agentx.db" })
 * );
 * ```
 */

import { createStorage, type Storage, type Driver } from "unstorage";
import { openDatabase, type Database } from "@agentxjs/common/sqlite";
import type { PersistenceDriver } from "../Persistence";

export interface SqliteDriverOptions {
  /**
   * Path to SQLite database file
   * @example "./data/agentx.db"
   */
  path: string;
}

/**
 * Create a custom unstorage driver using our SQLite abstraction
 */
function createSqliteUnstorageDriver(db: Database): Driver {
  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_storage (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kv_key ON kv_storage(key);
  `);

  return {
    name: "agentx-sqlite",

    hasItem(key: string): boolean {
      const row = db.prepare("SELECT 1 FROM kv_storage WHERE key = ?").get(key);
      return row !== undefined;
    },

    getItem(key: string): string | null {
      const row = db.prepare("SELECT value FROM kv_storage WHERE key = ?").get(key) as
        | { value: string }
        | undefined;
      return row?.value ?? null;
    },

    setItem(key: string, value: string): void {
      const now = Date.now();
      const existing = db.prepare("SELECT 1 FROM kv_storage WHERE key = ?").get(key);
      if (existing) {
        db.prepare("UPDATE kv_storage SET value = ?, updated_at = ? WHERE key = ?").run(
          value,
          now,
          key
        );
      } else {
        db.prepare(
          "INSERT INTO kv_storage (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)"
        ).run(key, value, now, now);
      }
    },

    removeItem(key: string): void {
      db.prepare("DELETE FROM kv_storage WHERE key = ?").run(key);
    },

    getKeys(): string[] {
      const rows = db.prepare("SELECT key FROM kv_storage").all() as { key: string }[];
      return rows.map((r) => r.key);
    },

    clear(): void {
      db.exec("DELETE FROM kv_storage");
    },

    dispose(): void {
      db.close();
    },
  };
}

/**
 * Create a SQLite driver
 *
 * @param options - Driver options
 */
export function sqliteDriver(options: SqliteDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const db = openDatabase(options.path);
      const driver = createSqliteUnstorageDriver(db);

      return createStorage({ driver });
    },
  };
}
