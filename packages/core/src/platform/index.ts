/**
 * Platform Module
 *
 * AgentXPlatform dependency injection container.
 * Platform packages provide concrete implementations.
 *
 * Usage:
 * ```typescript
 * import type { AgentXPlatform } from "@agentxjs/core/platform";
 *
 * const platform: AgentXPlatform = {
 *   containerRepository,
 *   imageRepository,
 *   sessionRepository,
 *   eventBus,
 *   bashProvider, // optional
 * };
 * ```
 */

export type { AgentXPlatform } from "./types";
