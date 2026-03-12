/**
 * @agentxjs/mono-driver
 *
 * Unified cross-platform Driver using Vercel AI SDK.
 *
 * Features:
 * - Multi-provider: Anthropic, OpenAI, Google (and more)
 * - Cross-platform: Node.js, Bun, Cloudflare Workers, Edge Runtime
 * - Lightweight: Direct HTTP API calls, no subprocess
 *
 * @example
 * ```typescript
 * import { createMonoDriver } from "@agentxjs/mono-driver";
 *
 * const driver = createMonoDriver({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   agentId: "my-agent",
 *   systemPrompt: "You are helpful",
 *   options: {
 *     provider: "anthropic",
 *     maxSteps: 10,
 *   },
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

// Re-export Vercel AI SDK utilities for advanced usage
export { stepCountIs } from "ai";
// Converters (for advanced usage)
export { createEvent, toStopReason, toVercelMessage, toVercelMessages } from "./converters";
// Main exports
export { createMonoDriver, MonoDriver } from "./MonoDriver";
// Types
export type {
  MonoBuiltinProvider,
  MonoDriverConfig,
  MonoDriverOptions,
  MonoProvider,
  OpenAICompatibleConfig,
} from "./types";
