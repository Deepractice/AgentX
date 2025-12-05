/**
 * @agentxjs/runtime - Open source Runtime for AI Agents
 *
 * Provides Runtime implementation for Node.js platform:
 * - OpenRuntime: Creates and manages Containers
 * - Container: Manages Agents (run, destroy)
 * - SystemBus: Central event bus
 * - Environment: Claude SDK integration
 *
 * Architecture:
 * ```
 * OpenRuntime
 *   └── Container (manages Agents)
 *         └── Agent (with Sandbox)
 * ```
 *
 * @example
 * ```typescript
 * import { openRuntime } from "@agentxjs/runtime";
 *
 * const runtime = openRuntime();
 * const container = runtime.createContainer("my-container");
 * const agent = container.run({
 *   name: "Assistant",
 *   systemPrompt: "You are helpful",
 * });
 *
 * agent.on("text_delta", (e) => process.stdout.write(e.data.text));
 * await agent.receive("Hello!");
 *
 * runtime.dispose();
 * ```
 */

// OpenRuntime (main entry point)
export { OpenRuntime, openRuntime, type OpenRuntimeConfig } from "./OpenRuntime";

// Container
export { ContainerImpl, type ContainerImplConfig } from "./container";

// SystemBus
export { SystemBusImpl } from "./SystemBusImpl";

// Driver
export { BusDriver, type BusDriverConfig } from "./driver";

// Environment
export * from "./environment";

// Infrastructure (Repository, LLM, Logger)
export * from "./runtime";

// Utils
export * from "./utils";

// Legacy exports (deprecated)
export { AgentRuntime, createRuntime, type AgentRuntimeConfig } from "./AgentRuntime";
