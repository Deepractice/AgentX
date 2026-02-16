/**
 * Runtime Module
 *
 * AgentXRuntime interface and implementation.
 * AgentXPlatform is re-exported here for backward compatibility,
 * but its canonical home is @agentxjs/core/platform.
 *
 * Usage:
 * ```typescript
 * import type { AgentXPlatform } from "@agentxjs/core/platform";
 * import type { AgentXRuntime, RuntimeAgent } from "@agentxjs/core/runtime";
 *
 * const runtime = createAgentXRuntime(platform, createDriver);
 *
 * // Create agent from image
 * const agent = await runtime.createAgent({ imageId: "img_xxx" });
 *
 * // Send message
 * await runtime.receive(agent.agentId, "Hello!");
 *
 * // Subscribe to events
 * const sub = runtime.subscribe(agent.agentId, (event) => {
 *   console.log(event.type, event.data);
 * });
 *
 * // Cleanup
 * sub.unsubscribe();
 * await runtime.destroyAgent(agent.agentId);
 * ```
 */

export { AgentXRuntimeImpl, createAgentXRuntime } from "./AgentXRuntime";
export type {
  AgentEventHandler,
  AgentLifecycle,
  AgentXPlatform,
  AgentXRuntime,
  AgentXRuntimeConfig,
  CreateAgentOptions,
  CreateAgentXRuntime,
  RuntimeAgent,
  Subscription,
} from "./types";
