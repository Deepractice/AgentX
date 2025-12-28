/**
 * Filesystem Driver - File-based storage
 *
 * Stores data as JSON files in a directory.
 * No external dependencies required.
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { fsDriver } from "@agentxjs/persistence/fs";
 *
 * const persistence = await createPersistence(
 *   fsDriver({ base: "./data" })
 * );
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface FsDriverOptions {
  /**
   * Base directory for storage
   * @example "./data"
   */
  base: string;
}

/**
 * Create a filesystem driver
 *
 * @param options - Driver options
 */
export function fsDriver(options: FsDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const { default: driver } = await import("unstorage/drivers/fs-lite");

      return createStorage({
        driver: driver({ base: options.base }),
      });
    },
  };
}
