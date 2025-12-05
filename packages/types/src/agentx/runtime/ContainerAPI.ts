/**
 * ContainerAPI - Container lifecycle management
 *
 * Container is an isolated runtime environment that holds Sessions.
 *
 * Hierarchy: Container → Session → Agent
 *
 * @example
 * ```typescript
 * // Create a container
 * const container = await agentx.runtime.containers.create("my-workspace");
 *
 * // List all containers
 * const containers = await agentx.runtime.containers.list();
 *
 * // Delete a container (also deletes all sessions inside)
 * await agentx.runtime.containers.delete(containerId);
 * ```
 */

/**
 * Container info returned by ContainerAPI
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
 * ContainerAPI - Container CRUD operations
 */
export interface ContainerAPI {
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

  /**
   * Delete a container
   *
   * Deleting a container also deletes all sessions inside it.
   *
   * @param containerId - Container identifier
   * @returns true if deleted, false if not found
   */
  delete(containerId: string): Promise<boolean>;
}
