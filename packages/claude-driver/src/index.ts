/**
 * @agentxjs/claude-driver
 *
 * Claude SDK Driver for AgentX
 *
 * Provides Driver implementation for connecting AgentX to Claude SDK.
 *
 * Key Design:
 * - Clear input/output boundary (for recording/playback)
 * - receive() returns AsyncIterable<DriverStreamEvent>
 * - Single session communication
 *
 * Usage:
 * ```typescript
 * import { createClaudeDriver } from "@agentxjs/claude-driver";
 *
 * const driver = createClaudeDriver({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   agentId: "my-agent",
 *   systemPrompt: "You are helpful",
 * });
 *
 * await driver.initialize();
 *
 * for await (const event of driver.receive({ content: "Hello" })) {
 *   if (event.type === "text_delta") {
 *     process.stdout.write(event.data.text);
 *   }
 * }
 *
 * await driver.dispose();
 * ```
 */

// Main exports
export { ClaudeDriver, createClaudeDriver } from "./ClaudeDriver";

// Re-export types from core for convenience
export type {
  Driver,
  DriverConfig,
  DriverState,
  CreateDriver,
  DriverStreamEvent,
  StopReason,
} from "@agentxjs/core/driver";

// Internal utilities (for advanced usage)
export {
  SDKQueryLifecycle,
  type SDKQueryCallbacks,
  type SDKQueryConfig,
} from "./SDKQueryLifecycle";
export { buildSDKContent, buildSDKUserMessage } from "./helpers";
