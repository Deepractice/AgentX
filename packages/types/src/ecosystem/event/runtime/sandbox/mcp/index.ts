/**
 * Sandbox MCP Events
 *
 * Events for MCP (Model Context Protocol) tool operations.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base MCPEvent
 */
export interface MCPEvent<T extends string = string, D = unknown> extends RuntimeEvent<T, D> {
  source: "sandbox";
  category: "mcp";
}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * ToolExecuteRequest - Request to execute a tool
 */
export interface ToolExecuteRequest extends MCPEvent<"tool_execute_request"> {
  intent: "request";
  data: {
    toolId: string;
    toolName: string;
    serverName: string;
    input: Record<string, unknown>;
    timestamp: number;
  };
}

/**
 * ToolExecutedEvent - Tool execution completed
 */
export interface ToolExecutedEvent extends MCPEvent<"tool_executed"> {
  intent: "result";
  data: {
    toolId: string;
    toolName: string;
    result: unknown;
    duration: number;
    timestamp: number;
  };
}

/**
 * ToolExecutionErrorEvent - Tool execution failed
 */
export interface ToolExecutionErrorEvent extends MCPEvent<"tool_execution_error"> {
  intent: "notification";
  data: {
    toolId: string;
    toolName: string;
    code: string;
    message: string;
    timestamp: number;
  };
}

// ============================================================================
// MCP Server Events
// ============================================================================

/**
 * MCPServerConnectedEvent - MCP server connected
 */
export interface MCPServerConnectedEvent extends MCPEvent<"mcp_server_connected"> {
  intent: "notification";
  data: {
    serverName: string;
    version?: string;
    toolCount: number;
    resourceCount: number;
    timestamp: number;
  };
}

/**
 * MCPServerDisconnectedEvent - MCP server disconnected
 */
export interface MCPServerDisconnectedEvent extends MCPEvent<"mcp_server_disconnected"> {
  intent: "notification";
  data: {
    serverName: string;
    reason?: string;
    timestamp: number;
  };
}

// ============================================================================
// Resource Events
// ============================================================================

/**
 * ResourceReadRequest - Request to read an MCP resource
 */
export interface ResourceReadRequest extends MCPEvent<"resource_read_request"> {
  intent: "request";
  data: {
    serverName: string;
    uri: string;
  };
}

/**
 * ResourceReadResult - Resource read result
 */
export interface ResourceReadResult extends MCPEvent<"resource_read_result"> {
  intent: "result";
  data: {
    serverName: string;
    uri: string;
    content: unknown;
    mimeType?: string;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllMCPEvent - All MCP events
 */
export type AllMCPEvent =
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
