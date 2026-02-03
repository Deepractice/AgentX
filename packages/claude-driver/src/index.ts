/**
 * @agentxjs/claude-driver
 *
 * Claude SDK Driver for AgentX
 *
 * Provides Driver implementation for connecting AgentX to Claude SDK.
 *
 * Usage:
 * ```typescript
 * import { createClaudeDriverFactory } from "@agentxjs/claude-driver";
 *
 * const factory = createClaudeDriverFactory();
 * const driver = factory.createDriver({
 *   agentId: "agent-1",
 *   config: {
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     model: "claude-sonnet-4-20250514",
 *   },
 * });
 *
 * // Connect to EventBus
 * driver.connect(bus.asConsumer(), bus.asProducer());
 * ```
 */

export { ClaudeDriver, ClaudeDriverFactory, createClaudeDriverFactory } from "./ClaudeDriver";
export {
  SDKQueryLifecycle,
  type SDKQueryCallbacks,
  type SDKQueryConfig,
} from "./SDKQueryLifecycle";
export { buildSDKContent, buildSDKUserMessage } from "./helpers";
