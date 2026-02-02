/**
 * Memory Driver - In-memory storage (default)
 *
 * Data is lost when the process exits.
 * Useful for development and testing.
 *
 * @example
 * ```typescript
 * import { createPersistence, memoryDriver } from "@agentxjs/persistence";
 *
 * const persistence = await createPersistence(memoryDriver());
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

/**
 * Create a memory driver
 *
 * No configuration needed - data is stored in memory.
 */
export function memoryDriver(): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      return createStorage();
    },
  };
}
