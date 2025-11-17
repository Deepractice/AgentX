/**
 * WebSocketServerAgent
 *
 * Pre-configured Agent that combines ClaudeAgent + WebSocketReactor.
 * Demonstrates Agent composition pattern: Agent as Driver!
 *
 * @example
 * ```typescript
 * import { WebSocketServerAgent } from "@deepractice-ai/agentx-framework/agents";
 * import { WebSocket } from "ws";
 *
 * const ws = new WebSocket("...");
 *
 * const agent = WebSocketServerAgent.create({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   ws: ws,
 * });
 *
 * await agent.initialize();
 * await agent.send("Hello!");  // Events forwarded to WebSocket!
 * ```
 */

import { defineAgent } from "../defineAgent";
import { ClaudeAgent } from "./ClaudeAgent";
import { WebSocketReactor } from "../reactors/WebSocketReactor";
import { defineConfig } from "../defineConfig";

/**
 * WebSocketServerAgent
 *
 * Agent composition pattern:
 * ClaudeAgent (as Driver) → WebSocketReactor
 *
 * This demonstrates how Agents can be nested/composed!
 */
export const WebSocketServerAgent = defineAgent({
  name: "WebSocketServer",
  driver: ClaudeAgent,  // ← Agent as Driver!
  reactors: [WebSocketReactor],
  config: defineConfig({
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-3-5-sonnet-20241022" },
    ws: { type: "object", required: true },  // WebSocket instance
  }),
});
