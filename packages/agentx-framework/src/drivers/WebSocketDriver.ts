/**
 * WebSocketDriver - Client-side WebSocket driver
 *
 * Implements AgentDriver interface by:
 * 1. Sending UserMessage to WebSocket server
 * 2. Receiving Stream events from server
 * 3. Yielding them as AsyncIterable
 *
 * Built with defineDriver for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { WebSocketDriver } from "@deepractice-ai/agentx-framework/drivers";
 *
 * const agent = defineAgent({
 *   name: "WebSocketClient",
 *   driver: WebSocketDriver,
 *   config: defineConfig({
 *     url: { type: "string", required: true },
 *     sessionId: { type: "string", required: true }
 *   })
 * });
 * ```
 */

import type { StreamEventType } from "@deepractice-ai/agentx-event";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import { defineDriver } from "../defineDriver";

export interface WebSocketDriverConfig {
  /**
   * WebSocket URL to connect to
   * @example "ws://localhost:5200/ws"
   */
  url: string;

  /**
   * Session ID for this agent instance
   */
  sessionId: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectionTimeout?: number;
}

/**
 * Helper: Connect to WebSocket server
 */
async function connectWebSocket(url: string, timeout: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url);

      const timeoutId = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
        ws.close();
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        console.log(`[WebSocketDriver] Connected to ${url}`);
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error("[WebSocketDriver] WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper: Extract first message from single or iterable
 */
async function getFirstMessage(
  messages: UserMessage | AsyncIterable<UserMessage>
): Promise<UserMessage> {
  if (Symbol.asyncIterator in Object(messages)) {
    for await (const msg of messages as AsyncIterable<UserMessage>) {
      return msg;
    }
    throw new Error("[WebSocketDriver] No messages in async iterable");
  }
  return messages as UserMessage;
}

/**
 * Helper: Send message and stream back events
 */
async function* sendAndReceive(
  ws: WebSocket,
  message: UserMessage
): AsyncIterable<StreamEventType> {
  const events: StreamEventType[] = [];
  let isDone = false;

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "message_stop") {
        isDone = true;
      }
      events.push(data);
    } catch (error) {
      console.error("[WebSocketDriver] Failed to parse message:", error);
    }
  };

  ws.addEventListener("message", handleMessage);

  try {
    // Send message to server
    ws.send(JSON.stringify({
      type: "user_message",
      data: message,
    }));

    // Yield events as they arrive
    while (!isDone) {
      await new Promise((resolve) => setTimeout(resolve, 10));

      while (events.length > 0) {
        const event = events.shift()!;
        yield event;

        if (event.type === "message_stop") {
          isDone = true;
          break;
        }
      }
    }
  } finally {
    ws.removeEventListener("message", handleMessage);
  }
}

/**
 * WebSocketDriver - Built with defineDriver
 */
export const WebSocketDriver = defineDriver<WebSocketDriverConfig>({
  name: "WebSocket",

  async *sendMessage(message, config) {
    // 1. Extract first message
    const firstMessage = await getFirstMessage(message);

    // 2. Connect to WebSocket
    const timeout = config.connectionTimeout ?? 5000;
    const ws = await connectWebSocket(config.url, timeout);

    try {
      // 3. Send message and yield events
      yield* sendAndReceive(ws, firstMessage);
    } finally {
      // 4. Close connection
      ws.close();
    }
  },

  onDestroy: () => {
    console.log("[WebSocketDriver] Destroyed");
  },
});
