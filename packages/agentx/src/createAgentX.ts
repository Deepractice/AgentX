/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * Supports two modes:
 * - Local mode: Uses Runtime directly (Claude API) - Node.js only
 * - Remote mode: Connects to AgentX server via WebSocket - Browser & Node.js
 *
 * Mode implementations are dynamically imported to enable tree-shaking
 * in browser builds.
 */

import type { AgentX, AgentXConfig } from "@agentxjs/types/agentx";
import { isRemoteConfig } from "@agentxjs/types/agentx";

/**
 * Create AgentX instance
 *
 * @param config - Configuration (LocalConfig or RemoteConfig)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * // Remote mode (browser & Node.js)
 * const agentx = await createAgentX({ serverUrl: "ws://localhost:5200" });
 *
 * // Local mode (Node.js only)
 * const agentx = await createAgentX({ llm: { apiKey: "sk-..." } });
 * ```
 */
export async function createAgentX(config?: AgentXConfig): Promise<AgentX> {
  if (config && isRemoteConfig(config)) {
    // Dynamic import for Remote mode
    const { createRemoteAgentX } = await import("./createRemoteAgentX");
    return createRemoteAgentX(config);
  }

  // Dynamic import for Local mode (tree-shaking in browser builds)
  const { createLocalAgentX } = await import("./createLocalAgentX");
  return createLocalAgentX(config ?? {});
}

// Re-export for direct usage
export { createRemoteAgentX } from "./createRemoteAgentX";
