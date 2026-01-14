/**
 * createRemoteAgentX - Remote mode implementation
 *
 * Connects to an AgentX server via WebSocket.
 * Works in both browser and Node.js environments.
 *
 * Uses Network layer's reliable message delivery - ACK is handled automatically
 * at the transport layer. Events are received directly (not wrapped in queue_entry).
 */

import type { AgentX, RemoteConfig, Unsubscribe } from "@agentxjs/types/agentx";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
  SystemEvent,
} from "@agentxjs/types/event";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agentx/RemoteClient");

/**
 * Create AgentX instance in remote mode
 *
 * @param config - Remote configuration (serverUrl, headers, context)
 * @returns AgentX instance
 */
export async function createRemoteAgentX(config: RemoteConfig): Promise<AgentX> {
  // Use @agentxjs/network for WebSocket client (handles browser/Node.js differences)
  const { createWebSocketClient } = await import("@agentxjs/network");

  const client = await createWebSocketClient({
    serverUrl: config.serverUrl,
    headers: config.headers,
    autoReconnect: true,
    minReconnectionDelay: 1000,
    maxReconnectionDelay: 10000,
    connectionTimeout: 4000,
    maxRetries: Infinity,
    debug: false,
  });

  logger.info("Client connected");

  const handlers = new Map<string, Set<(event: SystemEvent) => void>>();
  const pendingRequests = new Map<
    string,
    {
      resolve: (event: SystemEvent) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Track subscribed sessions
  const subscribedSessions = new Set<string>(["global"]); // Always subscribe to global

  // Helper: Subscribe to a session
  function subscribeToSession(sessionId: string): void {
    if (subscribedSessions.has(sessionId)) {
      return; // Already subscribed
    }

    client.send(
      JSON.stringify({
        type: "subscribe",
        sessionId,
      })
    );

    subscribedSessions.add(sessionId);
    logger.debug("Subscribed to session", { sessionId });
  }

  // Handle incoming messages
  // Network layer auto-ACKs reliable messages, we just receive the payload directly
  client.onMessage((message: string) => {
    try {
      const event = JSON.parse(message) as SystemEvent;

      logger.debug("Received event", {
        type: event.type,
        category: event.category,
        requestId: (event.data as any)?.requestId,
      });

      // Handle error events - log as error (but still dispatch to handlers)
      if (event.type === "system_error") {
        const errorData = event.data as { message: string; severity?: string; details?: unknown };
        logger.error(errorData.message, {
          severity: errorData.severity,
          requestId: (event.data as any)?.requestId,
          details: errorData.details,
        });
        // Continue to dispatch to handlers (don't return here)
      }

      // Check if it's a response to a pending request
      const requestId = (event.data as { requestId?: string })?.requestId;
      if (event.category === "response" && requestId && pendingRequests.has(requestId)) {
        logger.debug("Resolving pending request", { requestId, eventType: event.type });
        const pending = pendingRequests.get(requestId)!;
        clearTimeout(pending.timer);
        pendingRequests.delete(requestId);
        pending.resolve(event);
        return;
      }

      // Dispatch to type handlers
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
  });

  // Handle connection events
  client.onClose(() => {
    logger.warn("WebSocket closed");
  });

  client.onError((error: Error) => {
    logger.error("WebSocket error", { error: error.message });
  });

  // Re-subscribe to sessions on reconnection
  client.onOpen(() => {
    if (subscribedSessions.size > 1) {
      // More than just "global"
      logger.info("Reconnected, re-subscribing to sessions", {
        sessions: Array.from(subscribedSessions),
      });
      // Re-send subscribe messages
      for (const sessionId of subscribedSessions) {
        if (sessionId !== "global") {
          client.send(
            JSON.stringify({
              type: "subscribe",
              sessionId,
            })
          );
        }
      }
    }
  });

  function subscribe(type: string, handler: (event: SystemEvent) => void): Unsubscribe {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);
    return () => {
      handlers.get(type)?.delete(handler);
    };
  }

  return {
    async request<T extends CommandRequestType>(
      type: T,
      data: RequestDataFor<T>,
      timeout: number = 30000
    ): Promise<ResponseEventFor<T>> {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Resolve and merge context if provided
      let mergedData = { ...data, requestId };
      if (config.context) {
        try {
          let resolvedContext: Record<string, unknown>;
          if (typeof config.context === "function") {
            resolvedContext = await Promise.resolve(config.context());
          } else {
            resolvedContext = config.context;
          }

          // Merge context into data
          // Request-level context (if present in data) takes precedence
          mergedData = {
            ...resolvedContext,
            ...data,
            requestId,
          } as RequestDataFor<T> & { requestId: string };

          logger.debug("Merged context into request", {
            type,
            requestId,
            contextKeys: Object.keys(resolvedContext),
          });
        } catch (error) {
          logger.error("Failed to resolve context", {
            type,
            requestId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue without context if resolution fails
        }
      }

      const response = await new Promise<ResponseEventFor<T>>((resolve, reject) => {
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
          data: mergedData,
          source: "command",
          category: "request",
          intent: "request",
        };

        client.send(JSON.stringify(event));
      });

      // Auto-subscribe to session on successful session/image operations
      const typeStr = type as string;
      if (
        (typeStr === "session_get" ||
          typeStr === "session_create" ||
          typeStr === "image_create_request") &&
        response.category === "response"
      ) {
        // For image_create_response, sessionId is in record.sessionId
        const sessionId =
          (response.data as any)?.sessionId || (response.data as any)?.record?.sessionId;
        if (sessionId) {
          subscribeToSession(sessionId);
        }
      }

      return response;
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

    emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void {
      const event: SystemEvent = {
        type,
        timestamp: Date.now(),
        data,
        source: "command",
        category: type.toString().endsWith("_response") ? "response" : "request",
        intent: type.toString().endsWith("_response") ? "result" : "request",
      };
      client.send(JSON.stringify(event));
    },

    async listen() {
      throw new Error("Cannot listen in remote mode");
    },

    async close() {
      // No-op in remote mode
    },

    async dispose() {
      for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("AgentX disposed"));
      }
      pendingRequests.clear();
      handlers.clear();
      subscribedSessions.clear();
      client.dispose();
    },
  };
}
