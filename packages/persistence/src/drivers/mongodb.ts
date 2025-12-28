/**
 * MongoDB Driver - MongoDB database storage
 *
 * Requirements:
 * - Install: npm install mongodb
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { mongodbDriver } from "@agentxjs/persistence/mongodb";
 *
 * const persistence = await createPersistence(
 *   mongodbDriver({
 *     connectionString: "mongodb://localhost:27017",
 *     databaseName: "agentx",
 *   })
 * );
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface MongodbDriverOptions {
  /**
   * MongoDB connection string
   * @example "mongodb://localhost:27017"
   */
  connectionString: string;

  /**
   * Database name
   * @default "agentx"
   */
  databaseName?: string;

  /**
   * Collection name
   * @default "storage"
   */
  collectionName?: string;
}

/**
 * Create a MongoDB driver
 *
 * @param options - Driver options
 */
export function mongodbDriver(options: MongodbDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const { default: driver } = await import("unstorage/drivers/mongodb");

      return createStorage({
        driver: driver({
          connectionString: options.connectionString,
          databaseName: options.databaseName ?? "agentx",
          collectionName: options.collectionName ?? "storage",
        }),
      });
    },
  };
}
