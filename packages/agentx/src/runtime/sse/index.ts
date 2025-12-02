/**
 * AgentX SSE Runtime (Browser)
 *
 * Provides SSERuntime for browser to connect to remote AgentX servers.
 * Uses the same API as server-side (createAgentX), enabling unified code.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { sseRuntime } from "@deepractice-ai/agentx/runtime/sse";
 *
 * // Create runtime for browser
 * createAgentX(sseRuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 *   headers: { Authorization: "Bearer xxx" },
 * }));
 * ```
 *
 * @packageDocumentation
 */

// ==================== Runtime Factory (Primary API) ====================
export { sseRuntime, createSSERuntime, SSERuntime, type SSERuntimeConfig } from "./SSERuntime";

// ==================== Types ====================
export type { ConnectionState } from "./types";

// ==================== Advanced: Direct Class Access ====================
export { createSSEDriver, type SSEDriverConfig } from "./SSEDriver";
export { BrowserLogger, type BrowserLoggerOptions } from "./logger";
export { BrowserLoggerFactory, type BrowserLoggerFactoryOptions } from "./logger";
export { RemoteRepository } from "./repository";
