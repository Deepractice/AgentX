/**
 * @agentxjs/network - Network communication layer
 *
 * Provides WebSocket server and client with reliable message delivery.
 */

// Server exports
export { WebSocketServer } from "./server/WebSocketServer";
export { WebSocketConnection } from "./server/WebSocketConnection";

// Client exports
export { WebSocketClient } from "./client/WebSocketClient";
export { BrowserWebSocketClient } from "./client/BrowserWebSocketClient";

// Factory
export { createWebSocketClient } from "./factory";

// Protocol (for advanced usage)
export {
  isReliableWrapper,
  isAckMessage,
  type ReliableWrapper,
  type AckMessage,
} from "./protocol/reliable-message";

// Re-export types
export type {
  ChannelServer,
  ChannelClient,
  ChannelConnection,
  ChannelClientOptions,
  ChannelServerOptions,
  SendReliableOptions,
  Unsubscribe,
} from "@agentxjs/types/network";
