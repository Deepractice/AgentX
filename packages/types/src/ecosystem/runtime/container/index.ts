/**
 * Container Module - Runtime environment for Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * This module provides:
 * - Container: Agent instance management interface
 * - Sandbox: Isolated environment (Workspace + LLM)
 * - RuntimeDriver: Driver with Sandbox reference
 *
 * @see ContainerManager in agentx package for lifecycle management
 */

// Container interface
export type { Container } from "./Container";

// Sandbox is exported via ./sandbox/index.ts
// RuntimeDriver is exported via ./driver/RuntimeDriver.ts
