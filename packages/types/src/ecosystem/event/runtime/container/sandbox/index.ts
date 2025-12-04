/**
 * Sandbox Events
 *
 * All events related to Sandbox resource operations:
 * - Workspace: File system operations
 * - MCP: Model Context Protocol tools
 *
 * Note: LLM events are NOT part of Sandbox.
 * Agent system doesn't need to observe LLM-level events.
 */

// Workspace Events
export type {
  WorkspaceEvent,
  AllWorkspaceEvent,
  WorkspaceRequestEvent,
  WorkspaceResultEvent,
  FileReadRequest,
  FileReadResult,
  FileWriteRequest,
  FileWrittenEvent,
  FileDeleteRequest,
  FileDeletedEvent,
  DirectoryListRequest,
  DirectoryListResult,
  WorkspaceErrorEvent,
} from "./workspace";

// MCP Events
export type {
  MCPEvent,
  AllMCPEvent,
  MCPRequestEvent,
  MCPResultEvent,
  ToolExecuteRequest,
  ToolExecutedEvent,
  ToolExecutionErrorEvent,
  MCPServerConnectedEvent,
  MCPServerDisconnectedEvent,
  ResourceReadRequest,
  ResourceReadResult,
} from "./mcp";

// ============================================================================
// Combined Union
// ============================================================================

import type { AllWorkspaceEvent } from "./workspace";
import type { AllMCPEvent } from "./mcp";

/**
 * SandboxEvent - All sandbox events
 */
export type SandboxEvent = AllWorkspaceEvent | AllMCPEvent;

/**
 * Type guard: is this a sandbox event?
 */
export function isSandboxEvent(event: { source?: string }): event is SandboxEvent {
  return event.source === "sandbox";
}
