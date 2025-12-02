/**
 * Driver Module
 *
 * Claude Driver implementation for AgentX Runtime.
 * Transforms Claude SDK messages to AgentX StreamEvents.
 */

export { createClaudeDriver } from "./ClaudeDriver";
export type { ClaudeDriverConfig, ClaudeDriverOptions } from "./ClaudeDriver";

// Internal utilities (for advanced use)
export { buildOptions } from "./buildOptions";
export type { DriverContext } from "./buildOptions";
export { transformSDKMessages } from "./messageTransform";
export type { TransformOptions } from "./messageTransform";
export * from "./eventBuilders";
