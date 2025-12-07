/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * Supports two modes:
 * - Local mode: Uses Runtime directly (Claude API)
 * - Remote mode: Connects to AgentX server via WebSocket
 */

import type {
  AgentX,
  AgentXConfig,
  LocalConfig,
  Unsubscribe,
} from "@agentxjs/types/agentx";
import { isRemoteConfig } from "@agentxjs/types/agentx";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
  SystemEvent,
} from "@agentxjs/types/event";
import type { WebSocket as WS, WebSocketServer as WSS } from "ws";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agentx/createAgentX");
const remoteLogger = createLogger("agentx/RemoteClient");

/**
 * Create AgentX instance
 */
export async function createAgentX(config?: AgentXConfig): Promise<AgentX> {
  if (config && isRemoteConfig(config)) {
    return createRemoteAgentX(config.server);
  }
  return createLocalAgentX(config ?? {});
}

// ============================================================================
// Local Mode Implementation
// ============================================================================

async function createLocalAgentX(config: LocalConfig): Promise<AgentX> {
  // Apply logger configuration
  if (config.logger) {
    const { LoggerFactoryImpl, setLoggerFactory } = await import("@agentxjs/common");

    LoggerFactoryImpl.configure({
      defaultLevel: config.logger.level,
      consoleOptions: config.logger.console,
    });

    if (config.logger.factory) {
      setLoggerFactory(config.logger.factory);
    }
  }

  // Dynamic import to avoid bundling runtime in browser
  const { createRuntime, createPersistence } = await import("@agentxjs/runtime");

  // Create persistence from storage config
  const storageConfig = config.storage ?? {};
  const persistence = createPersistence(storageConfig as Parameters<typeof createPersistence>[0]);

  const runtime = createRuntime({
    persistence,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.llm?.apiKey ?? "",
        baseUrl: config.llm?.baseUrl,
        model: config.llm?.model,
      }),
    },
  });

  // WebSocket server state
  let peer: WSS | null = null;
  const connections = new Set<WS>();

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => runtime.on(type, handler),

    onCommand: (type, handler) => runtime.onCommand(type, handler),

    emitCommand: (type, data) => runtime.emitCommand(type, data),

    // Server API
    async listen(port: number, host?: string) {
      if (peer) {
        throw new Error("Server already listening");
      }

      const { WebSocketServer } = await import("ws");
      peer = new WebSocketServer({ port, host: host ?? "0.0.0.0" });

      peer.on("connection", (ws: WS) => {
        connections.add(ws);
        logger.info("Client connected", { totalConnections: connections.size });

        // Forward client commands to runtime
        ws.on("message", (data: Buffer) => {
          try {
            const event = JSON.parse(data.toString()) as SystemEvent;
            logger.info("Received from client", { type: event.type, requestId: (event.data as { requestId?: string })?.requestId });
            runtime.emit(event);
          } catch {
            // Ignore parse errors
          }
        });

        ws.on("close", () => {
          connections.delete(ws);
          logger.info("Client disconnected", { totalConnections: connections.size });
        });
      });

      // Forward runtime events to all clients (only broadcastable events)
      runtime.onAny((event) => {
        // Skip non-broadcastable events (internal events like DriveableEvent)
        if (event.broadcastable === false) {
          return;
        }

        logger.info("Broadcasting to clients", { type: event.type, category: event.category, requestId: (event.data as { requestId?: string })?.requestId });
        const message = JSON.stringify(event);
        for (const ws of connections) {
          if (ws.readyState === 1) {
            // WebSocket.OPEN
            ws.send(message);
          }
        }
      });
    },

    async close() {
      if (!peer) return;

      for (const ws of connections) {
        ws.close();
      }
      connections.clear();

      await new Promise<void>((resolve) => {
        peer!.close(() => resolve());
      });
      peer = null;
    },

    async dispose() {
      if (peer) {
        for (const ws of connections) {
          ws.close();
        }
        connections.clear();
        await new Promise<void>((resolve) => {
          peer!.close(() => resolve());
        });
        peer = null;
      }
      await runtime.dispose();
    },
  };
}

// ============================================================================
// Remote Mode Implementation
// ============================================================================

// Declare window for TypeScript (available in browser)
declare const window: { WebSocket: typeof WebSocket } | undefined;

// Detect browser environment
const isBrowser = typeof window !== "undefined" && typeof window.WebSocket !== "undefined";

async function createRemoteAgentX(serverUrl: string): Promise<AgentX> {
  // Use native WebSocket in browser, ws library in Node.js
  const WebSocketImpl = isBrowser
    ? window.WebSocket
    : (await import("ws")).WebSocket;

  const ws = new WebSocketImpl(serverUrl);
  const handlers = new Map<string, Set<(event: SystemEvent) => void>>();
  const pendingRequests = new Map<
    string,
    {
      resolve: (event: SystemEvent) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Wait for connection
  await new Promise<void>((resolve, reject) => {
    if (isBrowser) {
      // Browser WebSocket uses event properties
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("WebSocket connection failed"));
    } else {
      // Node.js ws uses EventEmitter
      (ws as any).on("open", () => resolve());
      (ws as any).on("error", (err: Error) => reject(err));
    }
  });

  // Handle incoming messages
  const handleMessage = (data: unknown) => {
    try {
      // Browser: data is MessageEvent, Node.js: data is Buffer
      const text = isBrowser
        ? (data as MessageEvent).data
        : (data as Buffer).toString();
      const event = JSON.parse(text) as SystemEvent;

      remoteLogger.info("Received event", { type: event.type, category: event.category, requestId: (event.data as any)?.requestId });

      // Handle error events - log as error (but still dispatch to handlers)
      if (event.type === "system_error") {
        const errorData = event.data as { message: string; severity?: string; details?: unknown };
        remoteLogger.error(errorData.message, {
          severity: errorData.severity,
          requestId: (event.data as any)?.requestId,
          details: errorData.details,
        });
        // Continue to dispatch to handlers (don't return here)
      }

      // Check if it's a response to a pending request
      // Only response events (category === "response") should resolve pending requests
      const requestId = (event.data as { requestId?: string })?.requestId;
      if (event.category === "response" && requestId && pendingRequests.has(requestId)) {
        remoteLogger.info("Resolving pending request", { requestId, eventType: event.type });
        const pending = pendingRequests.get(requestId)!;
        clearTimeout(pending.timer);
        pendingRequests.delete(requestId);
        pending.resolve(event);
        return;
      }
      remoteLogger.info("Dispatching to handlers", { type: event.type });

      // Dispatch to handlers
      const typeHandlers = handlers.get(event.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }

      // Dispatch to "*" handlers
      const allHandlers = handlers.get("*");
      if (allHandlers) {
        for (const handler of allHandlers) {
          handler(event);
        }
      }
    } catch {
      // Ignore parse errors
    }
  };

  // Register message handler
  if (isBrowser) {
    ws.onmessage = handleMessage;
  } else {
    (ws as any).on("message", handleMessage);
  }

  function subscribe(
    type: string,
    handler: (event: SystemEvent) => void
  ): Unsubscribe {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);
    return () => {
      handlers.get(type)?.delete(handler);
    };
  }

  return {
    request<T extends CommandRequestType>(
      type: T,
      data: RequestDataFor<T>,
      timeout: number = 30000
    ): Promise<ResponseEventFor<T>> {
      return new Promise((resolve, reject) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const timer = setTimeout(() => {
          pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${type}`));
        }, timeout);

        pendingRequests.set(requestId, {
          resolve: resolve as (event: SystemEvent) => void,
          reject,
          timer,
        });

        const event: SystemEvent = {
          type,
          timestamp: Date.now(),
          data: { ...data, requestId },
          source: "command",
          category: "request",
          intent: "request",
        };

        ws.send(JSON.stringify(event));
      });
    },

    on<T extends string>(
      type: T,
      handler: (event: SystemEvent & { type: T }) => void
    ): Unsubscribe {
      return subscribe(type, handler as (event: SystemEvent) => void);
    },

    onCommand<T extends keyof CommandEventMap>(
      type: T,
      handler: (event: CommandEventMap[T]) => void
    ): Unsubscribe {
      return subscribe(type, handler as (event: SystemEvent) => void);
    },

    emitCommand<T extends keyof CommandEventMap>(
      type: T,
      data: CommandEventMap[T]["data"]
    ): void {
      const event: SystemEvent = {
        type,
        timestamp: Date.now(),
        data,
        source: "command",
        category: type.toString().endsWith("_response") ? "response" : "request",
        intent: type.toString().endsWith("_response") ? "result" : "request",
      };
      ws.send(JSON.stringify(event));
    },

    async listen() {
      throw new Error("Cannot listen in remote mode");
    },

    async close() {
      // No-op in remote mode
    },

    async dispose() {
      // Clear pending requests
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("AgentX disposed"));
      }
      pendingRequests.clear();
      handlers.clear();

      ws.close();
    },
  };
}
