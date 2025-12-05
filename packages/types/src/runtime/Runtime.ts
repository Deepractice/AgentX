import type { Container } from "~/runtime/container/Container";

/**
 * Unsubscribe function returned by event subscription.
 */
export type Unsubscribe = () => void;

/**
 * Handler function for runtime events.
 * Generic to allow different event types.
 */
export type RuntimeEventHandler<E = unknown> = (event: E) => void;

/**
 * Runtime interface - the execution environment for AI Agents.
 *
 * Runtime is the top-level abstraction that:
 * - Creates and manages Containers
 * - Provides event infrastructure
 * - Handles resource lifecycle
 *
 * Architecture:
 * ```
 * Runtime
 *   └── Container (manages Agents)
 *         └── Agent (with Sandbox)
 * ```
 *
 * This is a pure abstraction. Concrete implementations:
 * - @agentxjs/runtime (Node.js)
 * - @agentxjs/mirror (Browser, proxies to server)
 */
export interface Runtime<E = unknown> {
  /**
   * Create a Container for managing Agent instances.
   *
   * Each Container provides:
   * - Agent lifecycle management (run, destroy)
   * - Sandbox isolation per Agent
   * - Internal event bus
   *
   * @param containerId - Unique container identifier
   * @returns Container instance
   */
  createContainer(containerId: string): Container;

  /**
   * Subscribe to all runtime events.
   *
   * @param handler - Callback invoked for each event
   * @returns Unsubscribe function to stop listening
   */
  on(handler: RuntimeEventHandler<E>): Unsubscribe;

  /**
   * Emit an event to the runtime.
   * Used internally by Receptors.
   *
   * @param event - The event to emit
   */
  emit(event: E): void;

  /**
   * Dispose the runtime and clean up resources.
   */
  dispose(): void;
}
