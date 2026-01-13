/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * Supports two modes:
 * - Local mode: Uses Runtime directly (Claude API) - Node.js only
 * - Remote mode: Connects to AgentX server via WebSocket - Browser & Node.js
 *
 * Local mode implementation is dynamically imported to enable tree-shaking
 * in browser builds.
 */

import type { AgentX, AgentXConfig, RemoteConfig, Unsubscribe } from "@agentxjs/types/agentx";
import { isRemoteConfig } from "@agentxjs/types/agentx";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
  SystemEvent,
} from "@agentxjs/types/event";
import { createLogger } from "@agentxjs/common";

const remoteLogger = createLogger("agentx/RemoteClient");

/**
 * Create AgentX instance
 *
 * @param config - Configuration (LocalConfig or RemoteConfig)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * // Remote mode (browser & Node.js)
 * const agentx = await createAgentX({ serverUrl: "ws://localhost:5200" });
 *
 * // Local mode (Node.js only)
 * const agentx = await createAgentX({ llm: { apiKey: "sk-..." } });
 * ```
 */
export async function createAgentX(config?: AgentXConfig): Promise<AgentX> {
  if (config && isRemoteConfig(config)) {
    return createRemoteAgentX(config);
  }

  // Dynamic import for tree-shaking in browser builds
  const { createLocalAgentX } = await import("./createLocalAgentX");
  return createLocalAgentX(config ?? {});
}

// ============================================================================
// Remote Mode Implementation (Browser & Node.js compatible)
// ============================================================================

// ============================================================================
// Client Storage Abstraction (localStorage for browser, in-memory for Node.js)
// ============================================================================

interface ClientStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Detect browser environment
const isBrowser =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).window !== "undefined" &&
  typeof (globalThis as any).window.localStorage !== "undefined";

function createClientStorage(): ClientStorage {
  // Browser environment - use localStorage
  if (isBrowser) {
    return (globalThis as any).window.localStorage;
  }

  // Node.js environment - use in-memory storage
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
}

function generateClientId(storage: ClientStorage): string {
  // Get or create base client ID (persistent across tabs/sessions)
  let baseClientId = storage.getItem("agentx:clientId");
  if (!baseClientId) {
    baseClientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.setItem("agentx:clientId", baseClientId);
  }

  // Generate tab ID (unique per tab/process)
  // In browser: use sessionStorage. In Node.js: generate new each time
  let tabId: string;
  if (isBrowser && typeof (globalThis as any).window.sessionStorage !== "undefined") {
    const sessionStorage = (globalThis as any).window.sessionStorage;
    tabId = sessionStorage.getItem("agentx:tabId") ?? "";
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem("agentx:tabId", tabId);
    }
  } else {
    tabId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  return `${baseClientId}:${tabId}`;
}

// ============================================================================
// Remote Mode Implementation (Browser & Node.js compatible)
// ============================================================================

/**
 * Create AgentX instance in remote mode
 *
 * Connects to an AgentX server via WebSocket.
 * Works in both browser and Node.js environments.
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

  // Client storage and ID
  const storage = createClientStorage();
  const clientId = generateClientId(storage);

  remoteLogger.info("Client initialized", { clientId });

  const handlers = new Map<string, Set<(event: SystemEvent) => void>>();
  const pendingRequests = new Map<
    string,
    {
      resolve: (event: SystemEvent) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Track subscribed topics
  const subscribedTopics = new Set<string>();
  const pendingSubscriptions = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >();

  // Helper: Subscribe to a topic
  function subscribeToTopic(topic: string): Promise<void> {
    if (subscribedTopics.has(topic)) {
      return Promise.resolve(); // Already subscribed
    }

    const cursorKey = `agentx:cursor:${clientId}:${topic}`;
    const afterCursor = storage.getItem(cursorKey);

    client.send(
      JSON.stringify({
        type: "queue_subscribe",
        topic,
        clientId,
        afterCursor,
      })
    );

    subscribedTopics.add(topic);
    remoteLogger.debug("Subscribed to topic", { topic, afterCursor });

    // Return a promise that resolves when subscription is confirmed
    return new Promise<void>((resolve, reject) => {
      pendingSubscriptions.set(topic, { resolve, reject });
      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingSubscriptions.has(topic)) {
          pendingSubscriptions.delete(topic);
          reject(new Error(`Subscription timeout: ${topic}`));
        }
      }, 5000);
    });
  }

  // Helper: Send ACK
  function sendAck(topic: string, cursor: string) {
    client.send(
      JSON.stringify({
        type: "queue_ack",
        topic,
        clientId,
        cursor,
      })
    );

    // Store cursor
    const cursorKey = `agentx:cursor:${clientId}:${topic}`;
    storage.setItem(cursorKey, cursor);
  }

  // Handle incoming messages
  client.onMessage((message: string) => {
    try {
      const parsed = JSON.parse(message);

      // Handle queue_entry messages
      if (parsed.type === "queue_entry") {
        const { topic, cursor, event: innerEvent } = parsed;

        // Auto ACK
        sendAck(topic, cursor);

        // Dispatch the inner event to handlers
        if (innerEvent && typeof innerEvent === "object") {
          const event = innerEvent as SystemEvent;

          remoteLogger.debug("Received queue entry", {
            topic,
            cursor,
            eventType: event.type,
          });

          // Check if it's a response to a pending request (BEFORE dispatching to handlers)
          const requestId = (event.data as { requestId?: string })?.requestId;
          if (event.category === "response" && requestId && pendingRequests.has(requestId)) {
            remoteLogger.info("Resolving pending request from queue", {
              requestId,
              eventType: event.type,
            });
            const pending = pendingRequests.get(requestId)!;
            clearTimeout(pending.timer);
            pendingRequests.delete(requestId);
            pending.resolve(event);
            return; // Don't dispatch to handlers - request() will handle it
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
        }
        return;
      }

      // Handle queue_subscribed confirmation
      if (parsed.type === "queue_subscribed") {
        const topic = parsed.topic;
        remoteLogger.debug("Subscription confirmed", {
          topic,
          latestCursor: parsed.latestCursor,
        });

        // Resolve pending subscription promise
        const pending = pendingSubscriptions.get(topic);
        if (pending) {
          pending.resolve();
          pendingSubscriptions.delete(topic);
        }
        return;
      }

      // Handle regular events (non-queue)
      const event = parsed as SystemEvent;

      remoteLogger.info("Received event", {
        type: event.type,
        category: event.category,
        requestId: (event.data as any)?.requestId,
      });

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
  });

  // Handle connection events
  client.onClose(() => {
    remoteLogger.warn("WebSocket closed");
  });

  client.onError((error: Error) => {
    remoteLogger.error("WebSocket error", { error: error.message });
  });

  // Re-subscribe to topics on reconnection
  client.onOpen(() => {
    if (subscribedTopics.size > 0) {
      remoteLogger.info("Reconnected, re-subscribing to topics", {
        topics: Array.from(subscribedTopics),
      });
      // Clear and re-subscribe
      const topics = Array.from(subscribedTopics);
      subscribedTopics.clear();
      for (const topic of topics) {
        subscribeToTopic(topic);
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

  // Subscribe to "global" topic on initialization (wait for confirmation)
  // This ensures we receive responses for global commands (container, image without sessionId)
  await subscribeToTopic("global");

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

          remoteLogger.info("Merged context into request", {
            type,
            requestId,
            contextKeys: Object.keys(resolvedContext),
          });
        } catch (error) {
          remoteLogger.error("Failed to resolve context", {
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

      // Auto-subscribe to session topics on successful session/image operations
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
          // Wait for subscription to be confirmed before returning
          await subscribeToTopic(sessionId);
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
      // Unsubscribe from all topics
      for (const topic of subscribedTopics) {
        client.send(
          JSON.stringify({
            type: "queue_unsubscribe",
            topic,
            clientId,
          })
        );
      }
      subscribedTopics.clear();

      for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("AgentX disposed"));
      }
      pendingRequests.clear();
      handlers.clear();
      client.dispose();
    },
  };
}
