/**
 * Persistence - Core persistence implementation
 *
 * Creates a Persistence instance from a driver.
 * Each driver provides a createStorage() method that returns an unstorage Storage instance.
 */

import type { Storage } from "unstorage";
import type {
  Persistence,
  ImageRepository,
  ContainerRepository,
  SessionRepository,
} from "@agentxjs/types/runtime/internal";
import { createLogger } from "@agentxjs/common";

import { StorageImageRepository } from "./repository/StorageImageRepository";
import { StorageContainerRepository } from "./repository/StorageContainerRepository";
import { StorageSessionRepository } from "./repository/StorageSessionRepository";

const logger = createLogger("persistence/Persistence");

/**
 * Persistence driver interface
 *
 * Each driver must implement this interface.
 * The createStorage() method is called once during initialization.
 */
export interface PersistenceDriver {
  /**
   * Create the underlying storage instance
   */
  createStorage(): Promise<Storage>;
}

/**
 * PersistenceImpl - Internal implementation
 */
class PersistenceImpl implements Persistence {
  readonly images: ImageRepository;
  readonly containers: ContainerRepository;
  readonly sessions: SessionRepository;

  constructor(storage: Storage) {
    this.images = new StorageImageRepository(storage);
    this.containers = new StorageContainerRepository(storage);
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
 * import { createPersistence, memoryDriver } from "@agentxjs/persistence";
 *
 * const persistence = await createPersistence(memoryDriver());
 * ```
 */
export async function createPersistence(driver: PersistenceDriver): Promise<Persistence> {
  logger.debug("Creating persistence", { driver: driver.constructor.name });

  const storage = await driver.createStorage();
  const persistence = new PersistenceImpl(storage);

  logger.info("Persistence created successfully", { driver: driver.constructor.name });
  return persistence;
}
