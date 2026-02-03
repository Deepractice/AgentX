/**
 * WebSocket Server - Manages WebSocket connections
 *
 * Supports:
 * - Standalone mode (listen on port)
 * - Attached mode (attach to existing HTTP server)
 */

import type { WebSocket as WS, WebSocketServer as WSS } from "ws";
import type {
  ChannelServer,
  ChannelConnection,
  ChannelServerOptions,
  MinimalHTTPServer,
  Unsubscribe,
} from "@agentxjs/core/network";
import { createLogger } from "commonxjs/logger";
import { WebSocketConnection } from "./WebSocketConnection";

const logger = createLogger("node-provider/WebSocketServer");

/**
 * WebSocket Server
 */
export class WebSocketServer implements ChannelServer {
  private wss: WSS | null = null;
  private connections = new Set<WebSocketConnection>();
  private connectionHandlers = new Set<(connection: ChannelConnection) => void>();
  private options: ChannelServerOptions;
  private attachedToServer = false;

  constructor(options: ChannelServerOptions = {}) {
    this.options = options;
  }

  async listen(port: number, host: string = "0.0.0.0"): Promise<void> {
    if (this.wss) {
      throw new Error("Server already listening");
    }
    if (this.attachedToServer) {
      throw new Error(
        "Cannot listen when attached to existing server. The server should call listen() instead."
      );
    }

    const { WebSocketServer: WSS } = await import("ws");
    this.wss = new WSS({ port, host });

    this.wss.on("connection", (ws: WS) => {
      this.handleConnection(ws);
    });

    logger.info("WebSocket server listening", { port, host });
  }

  attach(server: MinimalHTTPServer, path: string = "/ws"): void {
    if (this.wss) {
      throw new Error("Server already initialized");
    }

    import("ws").then(({ WebSocketServer: WSS }) => {
      this.wss = new WSS({ noServer: true });

      // Handle WebSocket upgrade on the HTTP server
      server.on("upgrade", (request, socket, head) => {
        const url = new URL(
          (request as { url?: string }).url || "",
          `http://${(request as { headers: { host?: string } }).headers.host}`
        );
        if (url.pathname === path) {
          this.wss!.handleUpgrade(request as never, socket as never, head as never, (ws: WS) => {
            this.wss!.emit("connection", ws, request);
          });
        } else {
          (socket as { destroy: () => void }).destroy();
        }
      });

      this.wss.on("connection", (ws: WS) => {
        this.handleConnection(ws);
      });

      this.attachedToServer = true;
      logger.info("WebSocket attached to existing HTTP server", { path });
    });
  }

  private handleConnection(ws: WS): void {
    const connection = new WebSocketConnection(ws, this.options);
    this.connections.add(connection);

    logger.info("Client connected", {
      connectionId: connection.id,
      totalConnections: this.connections.size,
    });

    connection.onClose(() => {
      this.connections.delete(connection);

      logger.info("Client disconnected", {
        connectionId: connection.id,
        totalConnections: this.connections.size,
      });
    });

    // Notify handlers
    for (const handler of this.connectionHandlers) {
      handler(connection);
    }
  }

  onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  broadcast(message: string): void {
    for (const connection of this.connections) {
      connection.send(message);
    }
  }

  async close(): Promise<void> {
    if (!this.wss) return;

    for (const connection of this.connections) {
      connection.close();
    }
    this.connections.clear();

    // Don't close the server if attached to existing HTTP server
    if (!this.attachedToServer) {
      await new Promise<void>((resolve) => {
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          logger.warn("WebSocket server close timeout, forcing close");
          resolve();
        }, 1000);

        this.wss!.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    this.wss = null;
    logger.info("WebSocket server closed");
  }

  async dispose(): Promise<void> {
    await this.close();
    this.connectionHandlers.clear();
  }
}
