/**
 * Container - Runtime environment for Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * Each Container manages multiple Agents, each with its own Sandbox.
 *
 * In the Image-First model:
 * - Image is the persistent entity (conversation)
 * - Agent is a transient runtime instance of an Image
 * - Container tracks imageId → agentId mapping
 *
 * Architecture:
 * ```
 * Container
 *   └── Image 1 ──→ Agent 1 ─── Sandbox 1
 *   └── Image 2 ──→ (offline)
 *   └── Image 3 ──→ Agent 3 ─── Sandbox 3
 * ```
 *
 * Container provides:
 * - Image → Agent lifecycle management (runImage, stopImage)
 * - Sandbox creation per Agent (encapsulated)
 * - Runtime isolation between Containers
 * - Foundation for multi-agent collaboration
 *
 * @example
 * ```typescript
 * // Create container via Runtime
 * const container = await runtime.containers.create("container-1");
 *
 * // Run an agent from an image
 * const { agent, reused } = await container.runImage(imageRecord);
 *
 * // Use the agent
 * await agent.receive("Hello!");
 *
 * // Stop the image (destroys agent, keeps image)
 * await container.stopImage(imageId);
 *
 * // Dispose container
 * await container.dispose();
 * ```
 */

import type { Agent } from "../../Agent";
import type { ImageRecord } from "../persistence/record/ImageRecord";

/**
 * Container interface for managing Agent instances at runtime
 */
export interface Container {
  /**
   * Unique container identifier
   */
  readonly containerId: string;

  /**
   * Container creation timestamp
   */
  readonly createdAt: number;

  // ==================== Image → Agent Lifecycle ====================

  /**
   * Run an Image - create or reuse an Agent for the given Image
   *
   * @param image - ImageRecord to run
   * @returns { agent, reused } - the agent and whether it was reused
   */
  runImage(image: ImageRecord): Promise<{ agent: Agent; reused: boolean }>;

  /**
   * Stop an Image - destroy the Agent but keep the Image
   *
   * @param imageId - Image to stop
   * @returns true if agent was found and destroyed
   */
  stopImage(imageId: string): Promise<boolean>;

  /**
   * Get agent ID for an image (if running)
   */
  getAgentIdForImage(imageId: string): string | undefined;

  /**
   * Check if an image has a running agent
   */
  isImageOnline(imageId: string): boolean;

  // ==================== Agent Operations ====================

  /**
   * Get an Agent by ID
   */
  getAgent(agentId: string): Agent | undefined;

  /**
   * List all Agents in this container
   */
  listAgents(): Agent[];

  /**
   * Get the number of Agents in this container
   */
  get agentCount(): number;

  /**
   * Destroy an Agent by ID
   *
   * Cleans up Agent resources and removes from container.
   *
   * @param agentId - Agent to destroy
   * @returns true if agent was found and destroyed
   */
  destroyAgent(agentId: string): Promise<boolean>;

  /**
   * Destroy all Agents in this container
   */
  destroyAllAgents(): Promise<void>;

  // ==================== Container Lifecycle ====================

  /**
   * Dispose the container and all its Agents
   */
  dispose(): Promise<void>;
}
