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
 * RPC method name — "namespace.action" format.
 *
 * All valid methods are enumerated here as the single source of truth.
 * Handlers register these, clients call these — any mismatch is a compile error.
 */
export type RpcMethod =
  // Image lifecycle
  | "image.create"
  | "image.get"
  | "image.list"
  | "image.delete"
  | "image.run"
  | "image.stop"
  | "image.update"
  | "image.messages"
  // Instance (runtime agents)
  | "instance.get"
  | "instance.list"
  | "instance.destroy"
  | "instance.destroyAll"
  | "instance.interrupt"
  // Message
  | "message.send"
  // Runtime operations
  | "runtime.rewind"
  // LLM provider management
  | "llm.create"
  | "llm.get"
  | "llm.list"
  | "llm.update"
  | "llm.delete"
  | "llm.default"
  // OS (file system + shell)
  | "os.read"
  | "os.write"
  | "os.list";

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
