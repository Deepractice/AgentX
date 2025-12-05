/**
 * Agent - Runtime Agent (Complete Runtime Entity)
 *
 * A complete runtime agent composed of:
 * - LLM: Large Language Model connection
 * - Sandbox: Isolated environment (filesystem, permissions, tools)
 * - Engine: Event processing state machine
 * - Session: Conversation history (persisted)
 *
 * Managed by Container, supports stop/resume lifecycle.
 *
 * @example
 * ```typescript
 * const agent = await runtime.agents.run(containerId, config);
 *
 * // Interact
 * runtime.events.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 *
 * // Pause (session preserved)
 * await agent.stop();
 *
 * // Resume later
 * await agent.resume();
 *
 * // Destroy (cleanup everything)
 * await agent.destroy();
 * ```
 */

import type { AgentLifecycle } from "./AgentLifecycle";

/**
 * Runtime Agent interface
 */
export interface Agent {
  /**
   * Unique agent identifier
   */
  readonly agentId: string;

  /**
   * Agent name (from config or default)
   */
  readonly name: string;

  /**
   * Parent container ID
   */
  readonly containerId: string;

  /**
   * Current lifecycle state
   */
  readonly lifecycle: AgentLifecycle;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  readonly createdAt: number;

  // ==================== Interaction ====================

  /**
   * Send a message to the agent
   *
   * @param message - User message content
   */
  receive(message: string): Promise<void>;

  /**
   * Interrupt current processing
   *
   * Stops the current operation gracefully.
   */
  interrupt(): void;

  // ==================== Lifecycle ====================

  /**
   * Stop the agent
   *
   * Pauses the agent, preserving session data.
   * Can be resumed later with resume().
   */
  stop(): Promise<void>;

  /**
   * Resume a stopped agent
   *
   * Restores the agent from preserved session data.
   */
  resume(): Promise<void>;

  /**
   * Destroy the agent
   *
   * Completely removes the agent and all associated data.
   * Cannot be resumed after destruction.
   */
  destroy(): Promise<void>;
}
