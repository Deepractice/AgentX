/**
 * Network Module
 *
 * Provides standard interfaces for client-server communication:
 * - ChannelServer: Server that accepts connections
 * - ChannelClient: Client that connects to server
 * - ChannelConnection: Server-side representation of a client
 * - Reliable Message Protocol: At-least-once delivery
 *
 * Implementations are provided by platform packages:
 * - @agentxjs/node: WebSocket (ws library)
 * - @agentxjs/cloudflare: Durable Objects WebSocket
 */

// JSON-RPC 2.0 Protocol
export type {
  ControlAckParams,
  NotificationMethod,
  RpcErrorResponse,
  RpcMethod,
  RpcNotification,
  RpcRequest,
  RpcSuccessResponse,
  StreamEventParams,
} from "./jsonrpc";
export {
  createAckNotification,
  createErrorResponse,
  createNotification,
  createRequest,
  createStreamEvent,
  createSuccessResponse,
  eventTypeToRpcMethod,
  isControlAck,
  isErrorResponse,
  isInvalid,
  isNotification,
  isRequest,
  isStreamEvent,
  isSuccessResponse,
  JsonRpcError,
  parseMessage,
  parseMessageObject,
  RpcErrorCodes,
  rpcMethodToResponseType,
} from "./jsonrpc";
// Protocol (reliable delivery)
export type { AckMessage, ReliableWrapper } from "./protocol";
export {
  createAck,
  generateMessageId,
  isAckMessage,
  isReliableWrapper,
  unwrapMessage,
  wrapMessage,
} from "./protocol";
// RPC Client
export type { RpcClientConfig, RpcClientState, WebSocketFactory } from "./RpcClient";
export { RpcClient } from "./RpcClient";
// Types
export type {
  ChannelClient,
  ChannelClientOptions,
  ChannelClientProvider,
  ChannelConnection,
  ChannelServer,
  ChannelServerOptions,
  ChannelServerProvider,
  ConnectionState,
  MinimalHTTPServer,
  SendReliableOptions,
  Unsubscribe,
} from "./types";
