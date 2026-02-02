/**
 * createLogger - Authoritative factory function signature
 *
 * Defines the standard API for creating Logger instances.
 * The agentx-common package must implement this signature exactly.
 *
 * @example
 * ```typescript
 * import { createLogger } from "@agentxjs/common";
 *
 * const logger = createLogger("engine/AgentEngine");
 * logger.info("Agent initialized", { agentId: "xxx" });
 * ```
 */

import type { Logger } from "./Logger";

// ============================================================================
// Function Declaration - Authoritative API
// ============================================================================

/**
 * createLogger - Factory function for creating Logger instances
 *
 * This is the authoritative API definition.
 * The agentx-common package must implement this function exactly.
 *
 * Uses lazy initialization: safe to call at module level before
 * Runtime is configured. The actual logger implementation is
 * resolved on first use.
 *
 * @param name - Logger name (hierarchical, e.g., "engine/AgentEngine")
 * @returns Logger instance (lazy proxy)
 *
 * @example
 * ```typescript
 * // Safe at module level (before Runtime configured)
 * const logger = createLogger("engine/AgentEngine");
 *
 * // Later, at runtime
 * logger.debug("Processing event", { agentId, eventType });
 * ```
 */
export declare function createLogger(name: string): Logger;
