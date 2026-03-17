/**
 * AgentX Server Implementation (JSON-RPC 2.0)
 *
 * Creates a WebSocket server that:
 * 1. Accepts client connections
 * 2. Handles JSON-RPC requests via RpcHandlerRegistry
 * 3. Broadcasts stream events as JSON-RPC notifications
 *
 * Message Types:
 * - RPC Request (has id): Client → Server → Client (direct response)
 * - RPC Notification (no id): Server → Client (stream events)
 */

import type { CreateDriver } from "@agentxjs/core/driver";
import type { BusEvent, SystemEvent } from "@agentxjs/core/event";
import type { ChannelConnection } from "@agentxjs/core/network";
import {
  createErrorResponse,
  createStreamEvent,
  createSuccessResponse,
  isNotification,
  isRequest,
  parseMessage,
  RpcErrorCodes,
} from "@agentxjs/core/network";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "@deepracticex/logger";
import { registerAll } from "./handlers";
import { RpcHandlerRegistry } from "./RpcHandlerRegistry";
import type { AgentXServer } from "./types";

const logger = createLogger("server/Server");

/**
 * Connection state
 */
interface ConnectionState {
  connection: ChannelConnection;
}

/**
 * Server configuration (supports both immediate and deferred platforms)
 */
export interface ServerConfig {
  /**
   * AgentX Platform — must provide `channelServer` for accepting WebSocket connections.
   */
  platform: AgentXPlatform;

  /**
   * LLM Driver factory function - creates Driver per Agent
   */
  createDriver: CreateDriver;

  /**
   * Port to listen on (standalone mode)
   */
  port?: number;

  /**
   * Host to bind to (default: "0.0.0.0")
   */
  host?: string;

  /**
   * Existing HTTP server to attach to (attached mode)
   */
  server?: import("@agentxjs/core/network").MinimalHTTPServer;

  /**
   * WebSocket path when attached (default: "/ws")
   */
  wsPath?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Create an AgentX server
 */
export async function createServer(config: ServerConfig): Promise<AgentXServer> {
  const { wsPath = "/ws" } = config;
  const platform = config.platform;

  // Create runtime from platform + driver
  const runtime = createAgentXRuntime(platform, config.createDriver);

  // Get channel server from platform
  const wsServer = platform.channelServer;
  if (!wsServer) {
    throw new Error("Platform must provide channelServer for server mode");
  }

  // Create RPC handler registry
  const registry = new RpcHandlerRegistry();
  registerAll(registry);

  // Track connections
  const connections = new Map<string, ConnectionState>();

  /**
   * Check if event should be sent to connection.
   * All broadcastable events are sent to all connections — no topic filtering.
   * Client-side Presentation filters by instanceId/imageId.
   */
  function shouldSendToConnection(_state: ConnectionState, event: BusEvent): boolean {
    if (event.source === "driver" && event.intent !== "notification") {
      return false;
    }
    if (event.source === "command") {
      return false;
    }
    return true;
  }

  /**
   * Send JSON-RPC response to a specific connection
   */
  function sendResponse(connection: ChannelConnection, id: string | number, result: unknown): void {
    const response = createSuccessResponse(id, result);
    connection.send(JSON.stringify(response));
  }

  /**
   * Send JSON-RPC error to a specific connection
   */
  function sendError(
    connection: ChannelConnection,
    id: string | number | null,
    code: number,
    message: string
  ): void {
    const response = createErrorResponse(id, code, message);
    connection.send(JSON.stringify(response));
  }

  // Handle new connections
  wsServer.onConnection((connection) => {
    const state: ConnectionState = {
      connection,
    };
    connections.set(connection.id, state);

    logger.info("Client connected", {
      connectionId: connection.id,
      totalConnections: connections.size,
    });

    // Handle messages from client
    connection.onMessage(async (message) => {
      try {
        const parsed = parseMessage(message);

        // Handle single message (not batch)
        if (!Array.isArray(parsed)) {
          await handleParsedMessage(connection, state, parsed);
        } else {
          // Handle batch (not common, but supported by JSON-RPC 2.0)
          for (const item of parsed) {
            await handleParsedMessage(connection, state, item);
          }
        }
      } catch (err) {
        logger.error("Failed to parse message", { error: (err as Error).message });
        sendError(connection, null, RpcErrorCodes.PARSE_ERROR, "Parse error");
      }
    });

    // Cleanup on disconnect
    connection.onClose(() => {
      connections.delete(connection.id);
      logger.info("Client disconnected", {
        connectionId: connection.id,
        totalConnections: connections.size,
      });
    });
  });

  /**
   * Handle a parsed JSON-RPC message
   */
  async function handleParsedMessage(
    connection: ChannelConnection,
    _state: ConnectionState,
    parsed: import("jsonrpc-lite").IParsedObject
  ): Promise<void> {
    if (isRequest(parsed)) {
      // JSON-RPC Request - handle and respond directly
      const payload = parsed.payload as {
        id: string | number;
        method: string;
        params: unknown;
      };
      const { id, method, params } = payload;

      logger.debug("Received RPC request", { id, method });

      // Call command handler
      const result = await registry.handle(runtime, method, params);

      if (result.success) {
        sendResponse(connection, id, result.data);
      } else {
        sendError(connection, id, result.code, result.message);
      }
    } else if (isNotification(parsed)) {
      const payload = parsed.payload as {
        method: string;
        params: unknown;
      };
      const { method } = payload;

      logger.debug("Received notification", { method });

      if (method === "control.ack") {
        // ACK for reliable delivery - handled by network layer
        logger.debug("Received ACK notification");
      }
    } else {
      // Invalid message
      logger.warn("Received invalid JSON-RPC message");
    }
  }

  // Broadcast all broadcastable events to all connected clients
  platform.eventBus.onAny((event) => {
    if (!shouldBroadcastEvent(event)) {
      return;
    }

    const eventWithContext = event as BusEvent & { context?: { sessionId?: string } };
    const topic = eventWithContext.context?.sessionId || "global";

    const notification = createStreamEvent(topic, event as SystemEvent);
    const message = JSON.stringify(notification);

    for (const [connectionId, state] of connections) {
      if (shouldSendToConnection(state, event)) {
        state.connection.sendReliable(message, {
          timeout: 10000,
          onTimeout: () => {
            logger.warn("Event ACK timeout", {
              connectionId,
              eventType: event.type,
            });
          },
        });
      }
    }
  });

  /**
   * Check if event should be broadcast
   */
  function shouldBroadcastEvent(event: BusEvent): boolean {
    // Skip internal driver events
    if (event.source === "driver" && event.intent !== "notification") {
      return false;
    }

    // Skip command events (handled via RPC)
    if (event.source === "command") {
      return false;
    }

    // Check broadcastable flag
    const systemEvent = event as SystemEvent;
    if (systemEvent.broadcastable === false) {
      return false;
    }

    return true;
  }

  // Attach to existing server if provided
  if (config.server) {
    wsServer.attach(config.server, wsPath);
    logger.info("WebSocket attached to existing server", { path: wsPath });
  }

  return {
    async listen(port?: number, host?: string) {
      if (config.server) {
        throw new Error(
          "Cannot listen when attached to existing server. The server should call listen() instead."
        );
      }

      const listenPort = port ?? config.port ?? 5200;
      const listenHost = host ?? config.host ?? "0.0.0.0";

      await wsServer.listen(listenPort, listenHost);
      logger.info("Server listening", { port: listenPort, host: listenHost });
    },

    async close() {
      await wsServer.close();
      logger.info("Server closed");
    },

    async dispose() {
      // Cleanup in order
      await wsServer.dispose();
      // registry is stateless, no dispose needed
      await runtime.shutdown();
      logger.info("Server disposed");
    },
  };
}
