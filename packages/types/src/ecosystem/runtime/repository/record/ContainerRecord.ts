/**
 * ContainerRecord - Storage record for Container
 *
 * Represents a logical container (resource isolation unit).
 * Each container provides an isolated environment for running Agents.
 *
 * In multi-tenant scenarios:
 * - Application layer maps tenant → containerId
 * - ContainerManager manages containers
 * - Each container has its own Sandbox (workspace, LLM config)
 */

/**
 * Container configuration (extensible)
 *
 * Future configurations may include:
 * - Resource quotas (max tokens, max agents)
 * - Custom workspace path
 * - LLM provider overrides
 */
export interface ContainerConfig {
  [key: string]: unknown;
}

/**
 * ContainerRecord - Persistent container data
 *
 * Stored in Repository for container lifecycle management.
 */
export interface ContainerRecord {
  /** Unique container identifier (auto-generated on create) */
  containerId: string;

  /** Container creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;

  /** Container configuration (extensible for future needs) */
  config?: ContainerConfig;
}
