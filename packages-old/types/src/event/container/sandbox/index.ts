/**
 * Sandbox Events
 *
 * All events related to Sandbox resource operations:
 * - Workdir: File system operations
 * - MCP: Model Context Protocol tools
 *
 * Note: LLM events are NOT part of Sandbox.
 * Agent system doesn't need to observe LLM-level events.
 */

// Workdir Events
export type {
  WorkdirEvent,
  WorkdirRequestEvent,
  WorkdirResultEvent,
  FileReadRequest,
  FileReadResult,
  FileWriteRequest,
  FileWrittenEvent,
  FileDeleteRequest,
  FileDeletedEvent,
  DirectoryListRequest,
  DirectoryListResult,
  WorkdirErrorEvent,
} from "./workdir";
export { isWorkdirEvent } from "./workdir";

// MCP Events
export type {
  MCPEvent,
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
export { isMCPEvent } from "./mcp";

// ============================================================================
// Combined Union
// ============================================================================

import type { WorkdirEvent } from "./workdir";
import type { MCPEvent } from "./mcp";

/**
 * SandboxEvent - All sandbox events
 */
export type SandboxEvent = WorkdirEvent | MCPEvent;

/**
 * Type guard: is this a sandbox event?
 */
export function isSandboxEvent(event: { source?: string }): event is SandboxEvent {
  return event.source === "sandbox";
}
