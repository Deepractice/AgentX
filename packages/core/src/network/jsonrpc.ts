/**
 * JSON-RPC 2.0 Protocol for AgentX Network Communication
 *
 * Uses jsonrpc-lite for message parsing/serialization.
 *
 * Message Types:
 * - Request: Client → Server (has id, expects response)
 * - Response: Server → Client (success or error)
 * - Notification: Server → Client (no id, stream events)
 *
 * @see https://www.jsonrpc.org/specification
 */

import type { IParsedObject, JsonRpc } from "jsonrpc-lite";
import {
  JsonRpcError,
  error as jsonrpcError,
  notification as jsonrpcNotification,
  parse as jsonrpcParse,
  parseObject as jsonrpcParseObject,
  request as jsonrpcRequest,
  success as jsonrpcSuccess,
} from "jsonrpc-lite";
import type { SystemEvent } from "../event/types/base";

// ============================================================================
// Re-export jsonrpc-lite types and functions
// ============================================================================

export { JsonRpcError };
export type { IParsedObject, JsonRpc };

// ============================================================================
// RPC Method Names
// ============================================================================

/**
 * All RPC method names supported by AgentX
 */
export type RpcMethod =
  // Container
  | "container.create"
  | "container.get"
  | "container.list"
  // Image
  | "image.create"
  | "image.get"
  | "image.list"
  | "image.delete"
  | "image.run"
  | "image.stop"
  | "image.update"
  | "image.messages"
  // Agent
  | "agent.get"
  | "agent.list"
  | "agent.destroy"
  | "agent.destroyAll"
  | "agent.interrupt"
  // Message
  | "message.send";

/**
 * Notification method names (server push)
 */
export type NotificationMethod =
  | "stream.event" // Stream events (text_delta, tool_call, etc.)
  | "control.ack"; // ACK for reliable delivery

// ============================================================================
// Request/Response Type Definitions
// ============================================================================

/**
 * JSON-RPC Request structure
 */
export interface RpcRequest<M extends RpcMethod = RpcMethod, P = unknown> {
  jsonrpc: "2.0";
  method: M;
  params: P;
  id: string | number;
}

/**
 * JSON-RPC Success Response structure
 */
export interface RpcSuccessResponse<R = unknown> {
  jsonrpc: "2.0";
  result: R;
  id: string | number;
}

/**
 * JSON-RPC Error Response structure
 */
export interface RpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

/**
 * JSON-RPC Notification structure (no id, no response expected)
 */
export interface RpcNotification<M extends NotificationMethod = NotificationMethod, P = unknown> {
  jsonrpc: "2.0";
  method: M;
  params: P;
}

/**
 * Stream event notification params
 */
export interface StreamEventParams {
  topic: string;
  event: SystemEvent;
}

/**
 * Control ACK notification params
 */
export interface ControlAckParams {
  msgId: string;
}

// ============================================================================
// Standard JSON-RPC Error Codes
// ============================================================================

export const RpcErrorCodes = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Server errors (reserved: -32000 to -32099)
  SERVER_ERROR: -32000,
  // Application errors (custom)
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TIMEOUT: 408,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a JSON-RPC request
 */
export function createRequest(
  id: string | number,
  method: RpcMethod | string,
  params: unknown
): JsonRpc {
  return jsonrpcRequest(id, method, params as Record<string, unknown>);
}

/**
 * Create a JSON-RPC notification (no response expected)
 */
export function createNotification(method: NotificationMethod | string, params: unknown): JsonRpc {
  return jsonrpcNotification(method, params as Record<string, unknown>);
}

/**
 * Create a stream event notification
 */
export function createStreamEvent(topic: string, event: SystemEvent): JsonRpc {
  return jsonrpcNotification("stream.event", { topic, event });
}

/**
 * Create an ACK notification
 */
export function createAckNotification(msgId: string): JsonRpc {
  return jsonrpcNotification("control.ack", { msgId });
}

/**
 * Create a success response
 */
export function createSuccessResponse(id: string | number, result: unknown): JsonRpc {
  return jsonrpcSuccess(id, result as Record<string, unknown>);
}

/**
 * Create an error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpc {
  return jsonrpcError(id, new JsonRpcError(message, code, data));
}

/**
 * Parse a JSON-RPC message string
 */
export function parseMessage(message: string): IParsedObject | IParsedObject[] {
  return jsonrpcParse(message);
}

/**
 * Parse a JSON-RPC message object
 */
export function parseMessageObject(obj: unknown): IParsedObject {
  return jsonrpcParseObject(obj);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if parsed message is a request
 */
export function isRequest(parsed: IParsedObject): boolean {
  return parsed.type === "request";
}

/**
 * Check if parsed message is a notification
 */
export function isNotification(parsed: IParsedObject): boolean {
  return parsed.type === "notification";
}

/**
 * Check if parsed message is a success response
 */
export function isSuccessResponse(parsed: IParsedObject): boolean {
  return parsed.type === "success";
}

/**
 * Check if parsed message is an error response
 */
export function isErrorResponse(parsed: IParsedObject): boolean {
  return parsed.type === "error";
}

/**
 * Check if parsed message is invalid
 */
export function isInvalid(parsed: IParsedObject): boolean {
  return parsed.type === "invalid";
}

/**
 * Check if notification is a stream event
 */
export function isStreamEvent(parsed: IParsedObject): parsed is IParsedObject & {
  payload: RpcNotification<"stream.event", StreamEventParams>;
} {
  if (parsed.type !== "notification") return false;
  const payload = parsed.payload as RpcNotification;
  return payload.method === "stream.event";
}

/**
 * Check if notification is a control ACK
 */
export function isControlAck(parsed: IParsedObject): parsed is IParsedObject & {
  payload: RpcNotification<"control.ack", ControlAckParams>;
} {
  if (parsed.type !== "notification") return false;
  const payload = parsed.payload as RpcNotification;
  return payload.method === "control.ack";
}

// ============================================================================
// Method Name Mapping (for backward compatibility)
// ============================================================================

/**
 * Map old event type names to new RPC method names
 */
export const eventTypeToRpcMethod: Record<string, RpcMethod> = {
  // Container
  container_create_request: "container.create",
  container_get_request: "container.get",
  container_list_request: "container.list",
  // Image
  image_create_request: "image.create",
  image_get_request: "image.get",
  image_list_request: "image.list",
  image_delete_request: "image.delete",
  image_run_request: "image.run",
  image_stop_request: "image.stop",
  image_update_request: "image.update",
  image_messages_request: "image.messages",
  // Agent
  agent_get_request: "agent.get",
  agent_list_request: "agent.list",
  agent_destroy_request: "agent.destroy",
  agent_destroy_all_request: "agent.destroyAll",
  agent_interrupt_request: "agent.interrupt",
  // Message
  message_send_request: "message.send",
};

/**
 * Map RPC method names back to response event types
 */
export const rpcMethodToResponseType: Record<RpcMethod, string> = {
  // Container
  "container.create": "container_create_response",
  "container.get": "container_get_response",
  "container.list": "container_list_response",
  // Image
  "image.create": "image_create_response",
  "image.get": "image_get_response",
  "image.list": "image_list_response",
  "image.delete": "image_delete_response",
  "image.run": "image_run_response",
  "image.stop": "image_stop_response",
  "image.update": "image_update_response",
  "image.messages": "image_messages_response",
  // Agent
  "agent.get": "agent_get_response",
  "agent.list": "agent_list_response",
  "agent.destroy": "agent_destroy_response",
  "agent.destroyAll": "agent_destroy_all_response",
  "agent.interrupt": "agent_interrupt_response",
  // Message
  "message.send": "message_send_response",
};
