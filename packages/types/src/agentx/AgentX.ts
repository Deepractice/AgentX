/**
 * AgentX - Unified API
 *
 * The central entry point for all agent operations.
 * Isomorphic - same interface for local and remote.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { createRuntime, createPersistence } from "@agentxjs/runtime";
 *
 * const agentx = createAgentX(createRuntime(), createPersistence());
 *
 * // Application API - static resources
 * await agentx.definitions.register(TranslatorDef);
 * const image = await agentx.images.getMetaImage("Translator");
 *
 * // Event subscription
 * agentx.events.on("text_delta", (e) => console.log(e));
 *
 * // Create container → session → run agent
 * const container = await agentx.containers.create("workspace");
 * const session = await agentx.sessions.create(container.containerId, image.imageId);
 * const agent = await agentx.sessions.run(session.sessionId);
 *
 * agent.on("text_delta", (e) => process.stdout.write(e.data.text));
 * await agent.receive("Hello!");
 * ```
 */

import type { DefinitionAPI, ImageAPI } from "./application";
import type { ContainerAPI, SessionAPI, AgentAPI, EventsAPI } from "./runtime";

/**
 * AgentX - Unified API interface
 *
 * Isomorphic: same interface works for both local runtime and remote connection.
 */
export interface AgentX {
  // ==================== Application API ====================

  /**
   * Definition registry (static resource)
   */
  readonly definitions: DefinitionAPI;

  /**
   * Image management (static resource)
   */
  readonly images: ImageAPI;

  // ==================== Runtime API ====================

  /**
   * Container management
   */
  readonly containers: ContainerAPI;

  /**
   * Session management
   */
  readonly sessions: SessionAPI;

  /**
   * Running agent management
   */
  readonly agents: AgentAPI;

  // ==================== Events ====================

  /**
   * Event subscription
   */
  readonly events: EventsAPI;

  // ==================== Lifecycle ====================

  /**
   * Dispose the AgentX instance and clean up resources
   */
  dispose(): void;
}
