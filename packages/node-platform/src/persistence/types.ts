/**
 * Persistence Types for Node Provider
 */

import type {
  ContainerRepository,
  ImageRepository,
  SessionRepository,
} from "@agentxjs/core/persistence";
import type { Storage } from "unstorage";

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
 * Persistence - Aggregated repositories
 */
export interface Persistence {
  readonly containers: ContainerRepository;
  readonly images: ImageRepository;
  readonly sessions: SessionRepository;
}
