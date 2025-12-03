/**
 * CreateAgentX - Authoritative factory function signature
 *
 * Defines the standard API for creating AgentX instances.
 * The agentx package must implement this signature exactly.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { NodeRuntime } from "agentxjs-claude";
 *
 * const runtime = new NodeRuntime({ apiKey: "xxx" });
 * const agentx = createAgentX(runtime);
 * ```
 */

import type { AgentX } from "./AgentX";
import type { Runtime } from "~/ecosystem/runtime/Runtime";

// ============================================================================
// Function Declaration - Authoritative API
// ============================================================================

/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * This is the authoritative API definition.
 * The agentx package must implement this function exactly.
 *
 * @param runtime - Runtime provides infrastructure (Container, Sandbox, Driver)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { NodeRuntime } from "agentxjs-claude";
 *
 * // Node.js environment
 * const nodeRuntime = new NodeRuntime({ apiKey: "xxx" });
 * const agentx = createAgentX(nodeRuntime);
 *
 * // Browser environment
 * const browserRuntime = new BrowserRuntime({ serverUrl: "http://..." });
 * const agentx = createAgentX(browserRuntime);
 * ```
 */
export declare function createAgentX(runtime: Runtime): AgentX;
