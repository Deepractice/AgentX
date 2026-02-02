/**
 * Sandbox layer
 *
 * External tool resource isolation for agents.
 * Isolates Workdir and MCP resources.
 *
 * Note: LLM is at container level, not in sandbox.
 */

export type { Sandbox } from "./Sandbox";
export type { Workdir } from "./workdir";
export * from "./mcp";
