/**
 * ContainerRepository - Persistence interface for containers
 */

import type { ContainerRecord } from "./record/ContainerRecord";

/**
 * ContainerRepository - Storage operations for containers
 */
export interface ContainerRepository {
  /**
   * Save a container record (create or update)
   */
  saveContainer(record: ContainerRecord): Promise<void>;

  /**
   * Find container by ID
   */
  findContainerById(containerId: string): Promise<ContainerRecord | null>;

  /**
   * Find all containers
   */
  findAllContainers(): Promise<ContainerRecord[]>;

  /**
   * Delete container by ID
   */
  deleteContainer(containerId: string): Promise<void>;

  /**
   * Check if container exists
   */
  containerExists(containerId: string): Promise<boolean>;
}
