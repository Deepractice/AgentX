/**
 * PostgreSQL Driver - PostgreSQL database storage
 *
 * Requirements:
 * - Install: npm install db0 pg
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { postgresqlDriver } from "@agentxjs/persistence/postgresql";
 *
 * const persistence = await createPersistence(
 *   postgresqlDriver({ connectionString: "postgres://user:pass@localhost:5432/agentx" })
 * );
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface PostgresqlDriverOptions {
  /**
   * PostgreSQL connection string
   * @example "postgres://user:pass@localhost:5432/agentx"
   */
  connectionString: string;
}

/**
 * Create a PostgreSQL driver
 *
 * @param options - Driver options
 */
export function postgresqlDriver(options: PostgresqlDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      const { default: pgConnector } = await import("db0/connectors/postgresql");

      const database = createDatabase(pgConnector({ connectionString: options.connectionString }));

      return createStorage({
        driver: db0Driver({ database }),
      });
    },
  };
}
