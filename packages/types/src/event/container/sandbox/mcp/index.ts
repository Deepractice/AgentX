/**
 * Sandbox MCP Events
 *
 * Events for MCP (Model Context Protocol) tool operations.
 *
 * All MCPEvents have:
 * - source: "sandbox"
 * - category: "mcp"
 * - intent: "request" | "result" | "notification"
 */

import type { SystemEvent } from "~/event/base";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base MCPRequest
 */
interface BaseMCPRequest<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "mcp", "request"> {}

/**
 * Base MCPResult
 */
interface BaseMCPResult<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "mcp", "result"> {}

/**
 * Base MCPNotification
 */
interface BaseMCPNotification<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "mcp", "notification"> {}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * ToolExecuteRequest - Request to execute a tool
 */
export interface ToolExecuteRequest
  extends BaseMCPRequest<
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
export interface ToolExecutedEvent
  extends BaseMCPResult<
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
export interface ToolExecutionErrorEvent
  extends BaseMCPNotification<
    "tool_execution_error",
    {
      toolId: string;
      toolName: string;
      code: string;
      message: string;
      timestamp: number;
    }
  > {}

// ============================================================================
// MCP Server Events
// ============================================================================

/**
 * MCPServerConnectedEvent - MCP server connected
 */
export interface MCPServerConnectedEvent
  extends BaseMCPNotification<
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
export interface MCPServerDisconnectedEvent
  extends BaseMCPNotification<
    "mcp_server_disconnected",
    {
      serverName: string;
      reason?: string;
      timestamp: number;
    }
  > {}

// ============================================================================
// Resource Events
// ============================================================================

/**
 * ResourceReadRequest - Request to read an MCP resource
 */
export interface ResourceReadRequest
  extends BaseMCPRequest<
    "resource_read_request",
    {
      serverName: string;
      uri: string;
    }
  > {}

/**
 * ResourceReadResult - Resource read result
 */
export interface ResourceReadResult
  extends BaseMCPResult<
    "resource_read_result",
    {
      serverName: string;
      uri: string;
      content: unknown;
      mimeType?: string;
    }
  > {}

// ============================================================================
// Union Type
// ============================================================================

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
export function isMCPEvent(event: SystemEvent): event is MCPEvent {
  return event.source === "sandbox" && event.category === "mcp";
}
