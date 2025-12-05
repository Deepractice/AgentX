/**
 * ContainerFacade - Container lifecycle management
 *
 * Internal facade for managing Container instances.
 * Container is an isolated runtime environment that holds Sessions.
 *
 * Hierarchy: Container → Session → Agent
 */

/**
 * Container info returned by ContainerFacade
 */
export interface ContainerInfo {
  /**
   * Unique container identifier
   */
  containerId: string;

  /**
   * Optional container name
   */
  name?: string;

  /**
   * Container creation timestamp
   */
  createdAt: Date;
}

/**
 * ContainerFacade - Container lifecycle management
 *
 * Note: Containers are persisted and not deletable.
 * Archive functionality may be added in the future.
 */
export interface ContainerFacade {
  /**
   * Create a new container
   *
   * @param name - Optional container name for identification
   * @returns Container info
   */
  create(name?: string): Promise<ContainerInfo>;

  /**
   * Get container by ID
   *
   * @param containerId - Container identifier
   * @returns Container info or undefined if not found
   */
  get(containerId: string): Promise<ContainerInfo | undefined>;

  /**
   * List all containers
   *
   * @returns Array of all containers
   */
  list(): Promise<ContainerInfo[]>;
}
