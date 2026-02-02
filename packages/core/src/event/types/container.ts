/**
 * Container Events - Container lifecycle and sandbox events
 *
 * Events for container operations in the event system.
 */

import type { SystemEvent } from "./base";

// ============================================================================
// Container Lifecycle Events
// ============================================================================

/**
 * Base ContainerLifecycleEvent
 */
interface BaseContainerLifecycleEvent<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "container",
  "lifecycle",
  "notification"
> {}

/**
 * ContainerCreatedEvent - Container was created
 */
export interface ContainerCreatedEvent extends BaseContainerLifecycleEvent<
  "container_created",
  {
    containerId: string;
    name?: string;
    createdAt: number;
  }
> {}

/**
 * ContainerDestroyedEvent - Container was destroyed
 */
export interface ContainerDestroyedEvent extends BaseContainerLifecycleEvent<
  "container_destroyed",
  {
    containerId: string;
    reason?: string;
    agentCount: number;
  }
> {}

/**
 * AgentRegisteredEvent - Agent was registered to container
 */
export interface AgentRegisteredEvent extends BaseContainerLifecycleEvent<
  "agent_registered",
  {
    containerId: string;
    agentId: string;
    definitionName: string;
    registeredAt: number;
  }
> {}

/**
 * AgentUnregisteredEvent - Agent was unregistered from container
 */
export interface AgentUnregisteredEvent extends BaseContainerLifecycleEvent<
  "agent_unregistered",
  {
    containerId: string;
    agentId: string;
    reason?: string;
  }
> {}

/**
 * ContainerLifecycleEvent - All container lifecycle events
 */
export type ContainerLifecycleEvent =
  | ContainerCreatedEvent
  | ContainerDestroyedEvent
  | AgentRegisteredEvent
  | AgentUnregisteredEvent;

/**
 * Type guard: is this a ContainerLifecycleEvent?
 */
export function isContainerLifecycleEvent(event: {
  source?: string;
  category?: string;
}): event is ContainerLifecycleEvent {
  return event.source === "container" && event.category === "lifecycle";
}

// ============================================================================
// Sandbox Workdir Events
// ============================================================================

/**
 * Base WorkdirRequest
 */
interface BaseWorkdirRequest<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "workdir",
  "request"
> {}

/**
 * Base WorkdirResult
 */
interface BaseWorkdirResult<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "workdir",
  "result"
> {}

/**
 * Base WorkdirNotification
 */
interface BaseWorkdirNotification<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "workdir",
  "notification"
> {}

/**
 * FileReadRequest - Request to read a file
 */
export interface FileReadRequest extends BaseWorkdirRequest<
  "file_read_request",
  {
    path: string;
    encoding?: string;
  }
> {}

/**
 * FileReadResult - File read result
 */
export interface FileReadResult extends BaseWorkdirResult<
  "file_read_result",
  {
    path: string;
    content: string;
    size: number;
    encoding: string;
  }
> {}

/**
 * FileWriteRequest - Request to write a file
 */
export interface FileWriteRequest extends BaseWorkdirRequest<
  "file_write_request",
  {
    path: string;
    content: string;
    encoding?: string;
    createDirectories?: boolean;
  }
> {}

/**
 * FileWrittenEvent - File was written
 */
export interface FileWrittenEvent extends BaseWorkdirResult<
  "file_written",
  {
    path: string;
    size: number;
    timestamp: number;
  }
> {}

/**
 * FileDeleteRequest - Request to delete a file
 */
export interface FileDeleteRequest extends BaseWorkdirRequest<
  "file_delete_request",
  {
    path: string;
    recursive?: boolean;
  }
> {}

/**
 * FileDeletedEvent - File was deleted
 */
export interface FileDeletedEvent extends BaseWorkdirResult<
  "file_deleted",
  {
    path: string;
    timestamp: number;
  }
> {}

/**
 * DirectoryListRequest - Request to list directory
 */
export interface DirectoryListRequest extends BaseWorkdirRequest<
  "directory_list_request",
  {
    path: string;
    recursive?: boolean;
    pattern?: string;
  }
> {}

/**
 * DirectoryListResult - Directory listing result
 */
export interface DirectoryListResult extends BaseWorkdirResult<
  "directory_list_result",
  {
    path: string;
    entries: Array<{
      name: string;
      type: "file" | "directory";
      size?: number;
      modifiedAt?: number;
    }>;
  }
> {}

/**
 * WorkdirErrorEvent - Workdir operation error
 */
export interface WorkdirErrorEvent extends BaseWorkdirNotification<
  "workdir_error",
  {
    operation: string;
    path: string;
    code: string;
    message: string;
  }
> {}

/**
 * WorkdirEvent - All workdir events
 */
export type WorkdirEvent =
  | FileReadRequest
  | FileReadResult
  | FileWriteRequest
  | FileWrittenEvent
  | FileDeleteRequest
  | FileDeletedEvent
  | DirectoryListRequest
  | DirectoryListResult
  | WorkdirErrorEvent;

/**
 * Workdir request events
 */
export type WorkdirRequestEvent =
  | FileReadRequest
  | FileWriteRequest
  | FileDeleteRequest
  | DirectoryListRequest;

/**
 * Workdir result events
 */
export type WorkdirResultEvent =
  | FileReadResult
  | FileWrittenEvent
  | FileDeletedEvent
  | DirectoryListResult;

/**
 * Type guard: is this a WorkdirEvent?
 */
export function isWorkdirEvent(event: {
  source?: string;
  category?: string;
}): event is WorkdirEvent {
  return event.source === "sandbox" && event.category === "workdir";
}

// ============================================================================
// Sandbox MCP Events
// ============================================================================

/**
 * Base MCPRequest
 */
interface BaseMCPRequest<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "mcp",
  "request"
> {}

/**
 * Base MCPResult
 */
interface BaseMCPResult<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "mcp",
  "result"
> {}

/**
 * Base MCPNotification
 */
interface BaseMCPNotification<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "sandbox",
  "mcp",
  "notification"
> {}

/**
 * ToolExecuteRequest - Request to execute a tool
 */
export interface ToolExecuteRequest extends BaseMCPRequest<
  "tool_execute_request",
  {
    toolId: string;
    toolName: string;
    serverName: string;
    input: Record<string, unknown>;
    timestamp: number;
  }
> {}

/**
 * ToolExecutedEvent - Tool execution completed
 */
export interface ToolExecutedEvent extends BaseMCPResult<
  "tool_executed",
  {
    toolId: string;
    toolName: string;
    result: unknown;
    duration: number;
    timestamp: number;
  }
> {}

/**
 * ToolExecutionErrorEvent - Tool execution failed
 */
export interface ToolExecutionErrorEvent extends BaseMCPNotification<
  "tool_execution_error",
  {
    toolId: string;
    toolName: string;
    code: string;
    message: string;
    timestamp: number;
  }
> {}

/**
 * MCPServerConnectedEvent - MCP server connected
 */
export interface MCPServerConnectedEvent extends BaseMCPNotification<
  "mcp_server_connected",
  {
    serverName: string;
    version?: string;
    toolCount: number;
    resourceCount: number;
    timestamp: number;
  }
> {}

/**
 * MCPServerDisconnectedEvent - MCP server disconnected
 */
export interface MCPServerDisconnectedEvent extends BaseMCPNotification<
  "mcp_server_disconnected",
  {
    serverName: string;
    reason?: string;
    timestamp: number;
  }
> {}

/**
 * ResourceReadRequest - Request to read an MCP resource
 */
export interface ResourceReadRequest extends BaseMCPRequest<
  "resource_read_request",
  {
    serverName: string;
    uri: string;
  }
> {}

/**
 * ResourceReadResult - Resource read result
 */
export interface ResourceReadResult extends BaseMCPResult<
  "resource_read_result",
  {
    serverName: string;
    uri: string;
    content: unknown;
    mimeType?: string;
  }
> {}

/**
 * MCPEvent - All MCP events
 */
export type MCPEvent =
  | ToolExecuteRequest
  | ToolExecutedEvent
  | ToolExecutionErrorEvent
  | MCPServerConnectedEvent
  | MCPServerDisconnectedEvent
  | ResourceReadRequest
  | ResourceReadResult;

/**
 * MCP request events
 */
export type MCPRequestEvent = ToolExecuteRequest | ResourceReadRequest;

/**
 * MCP result events
 */
export type MCPResultEvent = ToolExecutedEvent | ResourceReadResult;

/**
 * Type guard: is this a MCPEvent?
 */
export function isMCPEvent(event: {
  source?: string;
  category?: string;
}): event is MCPEvent {
  return event.source === "sandbox" && event.category === "mcp";
}

// ============================================================================
// Sandbox Event Union
// ============================================================================

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

// ============================================================================
// Container Event Union
// ============================================================================

/**
 * ContainerEvent - All container events
 */
export type ContainerEvent = ContainerLifecycleEvent | SandboxEvent;

/**
 * Type guard: is this a container event?
 */
export function isContainerEvent(event: { source?: string }): event is ContainerEvent {
  return event.source === "container" || event.source === "sandbox";
}
