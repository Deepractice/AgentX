/**
 * Persistence - Core persistence implementation
 *
 * Creates a Persistence instance from a driver.
 * Each driver provides a createStorage() method that returns an unstorage Storage instance.
 */

import { createLogger } from "commonxjs/logger";
import type { Storage } from "unstorage";
import { StorageContainerRepository } from "./StorageContainerRepository";
import { StorageImageRepository } from "./StorageImageRepository";
import { StorageSessionRepository } from "./StorageSessionRepository";
import type { Persistence, PersistenceDriver } from "./types";

const logger = createLogger("node-platform/Persistence");

/**
 * PersistenceImpl - Internal implementation
 */
class PersistenceImpl implements Persistence {
  readonly containers: StorageContainerRepository;
  readonly images: StorageImageRepository;
  readonly sessions: StorageSessionRepository;

  constructor(storage: Storage) {
    this.containers = new StorageContainerRepository(storage);
    this.images = new StorageImageRepository(storage);
    this.sessions = new StorageSessionRepository(storage);
  }
}

/**
 * Create a Persistence instance from a driver
 *
 * @param driver - The persistence driver to use
 * @returns Promise<Persistence> instance
 *
 * @example
 * ```typescript
 * import { createPersistence, memoryDriver } from "@agentxjs/node-platform/persistence";
 *
 * const persistence = await createPersistence(memoryDriver());
 * ```
 */
export async function createPersistence(driver: PersistenceDriver): Promise<Persistence> {
  logger.debug("Creating persistence");

  const storage = await driver.createStorage();
  const persistence = new PersistenceImpl(storage);

  logger.info("Persistence created successfully");
  return persistence;
}
