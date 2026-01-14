/**
 * WebSocket Client Factory
 *
 * Creates the appropriate WebSocket client based on environment.
 */

import type { ChannelClient, ChannelClientOptions } from "@agentxjs/types/network";

// Detect browser environment
const isBrowser =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).window !== "undefined" &&
  typeof (globalThis as any).window.WebSocket !== "undefined";

/**
 * Factory function to create the appropriate WebSocket client
 *
 * @param options - Client configuration
 * @returns Connected WebSocket client
 */
export async function createWebSocketClient(options: ChannelClientOptions): Promise<ChannelClient> {
  if (isBrowser) {
    const { BrowserWebSocketClient } = await import("./client/BrowserWebSocketClient");
    const client = new BrowserWebSocketClient(options);
    await client.connect();
    return client;
  } else {
    const { WebSocketClient } = await import("./client/WebSocketClient");
    const client = new WebSocketClient(options);
    await client.connect();
    return client;
  }
}
