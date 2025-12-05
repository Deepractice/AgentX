/**
 * SessionAPI - Session lifecycle management
 *
 * Session is a conversation context that belongs to a Container.
 * Session records Agent events and provides persistence.
 *
 * Hierarchy: Container → Session → Agent
 *
 * @example
 * ```typescript
 * // Create a session in a container
 * const session = await agentx.runtime.sessions.create(containerId, imageId);
 *
 * // Run an agent from session
 * const agent = await agentx.runtime.sessions.run(sessionId);
 *
 * // List sessions in a container
 * const sessions = await agentx.runtime.sessions.listByContainer(containerId);
 * ```
 */

import type { Agent } from "~/agent";

/**
 * Session info returned by SessionAPI
 */
export interface SessionInfo {
  /**
   * Unique session identifier
   */
  sessionId: string;

  /**
   * Container this session belongs to
   */
  containerId: string;

  /**
   * Image this session was created from
   */
  imageId: string;

  /**
   * Optional session title
   */
  title?: string;

  /**
   * Session creation timestamp
   */
  createdAt: Date;

  /**
   * Last activity timestamp
   */
  updatedAt: Date;
}

/**
 * SessionAPI - Session CRUD and Agent execution
 */
export interface SessionAPI {
  /**
   * Create a new session in a container
   *
   * @param containerId - Container to create session in
   * @param imageId - Image to create session from
   * @returns Session info
   */
  create(containerId: string, imageId: string): Promise<SessionInfo>;

  /**
   * Get session by ID
   *
   * @param sessionId - Session identifier
   * @returns Session info or undefined if not found
   */
  get(sessionId: string): Promise<SessionInfo | undefined>;

  /**
   * List all sessions in a container
   *
   * @param containerId - Container identifier
   * @returns Array of sessions in the container
   */
  listByContainer(containerId: string): Promise<SessionInfo[]>;

  /**
   * Delete a session
   *
   * @param sessionId - Session identifier
   * @returns true if deleted, false if not found
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * Run an agent from a session
   *
   * Creates an Agent and binds it to the Session for event collection.
   * Session must exist before Agent can run (ensures no events are lost).
   *
   * @param sessionId - Session to run agent from
   * @returns Running agent instance
   *
   * @example
   * ```typescript
   * const agent = await agentx.runtime.sessions.run(sessionId);
   * agent.on("text_delta", (e) => console.log(e.data.text));
   * await agent.receive("Hello!");
   * ```
   */
  run(sessionId: string): Promise<Agent>;
}
