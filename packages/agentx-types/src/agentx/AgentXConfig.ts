/**
 * AgentX Configuration Types
 *
 * @deprecated Configuration is now handled by runtime factories.
 * Use `nodeRuntime()` or `sseRuntime()` instead.
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * createAgentX({ remote: { serverUrl: "..." } });
 *
 * // New way
 * import { sseRuntime } from "@deepractice-ai/agentx/runtime/sse";
 * createAgentX(sseRuntime({ serverUrl: "..." }));
 * ```
 */

// This file is kept for backward compatibility.
// New code should use runtime factory functions directly.
