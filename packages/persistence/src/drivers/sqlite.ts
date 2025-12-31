/**
 * SQLite Driver - SQLite database storage
 *
 * Uses db0 with bun-sqlite connector for high performance.
 *
 * Requirements:
 * - Bun runtime (uses bun:sqlite internally)
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

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface SqliteDriverOptions {
  /**
   * Path to SQLite database file
   * @example "./data/agentx.db"
   */
  path: string;
}

/**
 * Create a SQLite driver
 *
 * @param options - Driver options
 */
export function sqliteDriver(options: SqliteDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      // Dynamic imports to avoid bundling when not used
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      const { default: bunSqliteConnector } = await import("db0/connectors/bun-sqlite");

      const database = createDatabase(bunSqliteConnector({ path: options.path }));

      return createStorage({
        driver: db0Driver({ database }),
      });
    },
  };
}
