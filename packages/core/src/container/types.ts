/**
 * Container Types
 *
 * Container is the resource isolation unit.
 * Each container provides an isolated environment for Images and Agents.
 *
 * Lifecycle:
 * - create() → ContainerRecord (persistent)
 * - Container manages multiple Images/Agents within its boundary
 */

import type { ImageRepository } from "../image/types";
import type { SessionRepository } from "../session/types";

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type { ContainerRecord, ContainerConfig, ContainerRepository } from "../persistence/types";

// ============================================================================
// Container Interface
// ============================================================================

/**
 * Container - Resource isolation unit
 *
 * Manages Images and Agents within an isolated boundary.
 */
export interface Container {
  readonly containerId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly config: Record<string, unknown> | undefined;

  /**
   * Update container configuration
   */
  update(updates: { config?: Record<string, unknown> }): Promise<Container>;

  /**
   * Delete this container and all its resources
   */
  delete(): Promise<void>;

  /**
   * Get the underlying record
   */
  toRecord(): import("../persistence/types").ContainerRecord;
}

// ============================================================================
// Container Configuration
// ============================================================================

/**
 * Context needed by Container operations
 */
export interface ContainerContext {
  containerRepository: import("../persistence/types").ContainerRepository;
  imageRepository: ImageRepository;
  sessionRepository: SessionRepository;
}

/**
 * Configuration for creating a new Container
 */
export interface ContainerCreateConfig {
  containerId?: string;
  config?: Record<string, unknown>;
}
