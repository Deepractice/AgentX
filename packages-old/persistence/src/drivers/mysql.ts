/**
 * MySQL Driver - MySQL database storage
 *
 * Requirements:
 * - Install: npm install db0 mysql2
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { mysqlDriver } from "@agentxjs/persistence/mysql";
 *
 * const persistence = await createPersistence(
 *   mysqlDriver({ uri: "mysql://user:pass@localhost:3306/agentx" })
 * );
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface MysqlDriverOptions {
  /**
   * MySQL connection URI
   * @example "mysql://user:pass@localhost:3306/agentx"
   */
  uri: string;
}

/**
 * Create a MySQL driver
 *
 * @param options - Driver options
 */
export function mysqlDriver(options: MysqlDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      const { default: mysqlConnector } = await import("db0/connectors/mysql2");

      const database = createDatabase(mysqlConnector({ uri: options.uri }));

      return createStorage({
        driver: db0Driver({ database }),
      });
    },
  };
}
