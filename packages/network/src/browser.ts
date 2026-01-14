/**
 * @agentxjs/network - Network layer abstraction (Browser)
 *
 * Browser-only exports with auto-reconnect support.
 */

export { BrowserWebSocketClient } from "./client/BrowserWebSocketClient";
export { createWebSocketClient } from "./factory";

// Protocol (for advanced usage)
export { isReliableWrapper, type ReliableWrapper } from "./protocol/reliable-message";

// Re-export types
export type { ChannelClient, ChannelClientOptions, Unsubscribe } from "@agentxjs/types/network";
