/**
 * SQLite Driver - SQLite database storage
 *
 * Uses db0 with automatic runtime detection:
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

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

declare const Bun: unknown;

export interface SqliteDriverOptions {
  /**
   * Path to SQLite database file
   * @example "./data/agentx.db"
   */
  path: string;
}

/**
 * Detect runtime and return appropriate SQLite connector
 */
async function getSqliteConnector(path: string) {
  // Bun runtime - use bun:sqlite
  if (typeof Bun !== "undefined") {
    const { default: bunSqliteConnector } = await import("db0/connectors/bun-sqlite");
    return bunSqliteConnector({ path });
  }

  // Node.js 22+ - use built-in node:sqlite
  const nodeSqlite = globalThis.process?.getBuiltinModule?.("node:sqlite");
  if (nodeSqlite) {
    const { default: nodeSqliteConnector } = await import("db0/connectors/node-sqlite");
    return nodeSqliteConnector({ path });
  }

  throw new Error("No SQLite driver available. Requires Bun runtime or Node.js 22+.");
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

      const connector = await getSqliteConnector(options.path);
      const database = createDatabase(connector);

      return createStorage({
        driver: db0Driver({ database }),
      });
    },
  };
}
