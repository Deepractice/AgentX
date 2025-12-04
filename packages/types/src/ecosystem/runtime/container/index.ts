/**
 * Container Module - Runtime environment for Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * This module provides:
 * - Container: Agent instance management interface
 * - Sandbox: External tool isolation (Workspace + MCP)
 * - LLM: Large Language Model provider (at container level)
 * - RuntimeDriver: Driver with Sandbox reference
 *
 * Architecture:
 * ```
 * Container
 * ├── Sandbox (workspace, mcp)
 * └── LLM (parallel to sandbox)
 * ```
 *
 * @see ContainerManager in agentx package for lifecycle management
 */

// Container interface
export type { Container } from "./Container";

// Sandbox is exported via ./sandbox/index.ts
// LLM is exported via ./llm/index.ts
// RuntimeDriver is exported via ./driver/RuntimeDriver.ts
