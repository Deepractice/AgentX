/**
 * createLocalAgentX - Local mode implementation
 *
 * This file is dynamically imported to enable tree-shaking in browser builds.
 * Contains Node.js specific code (runtime, WebSocket server).
 */

import type { AgentX, LocalConfig } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";
import type { Message } from "@agentxjs/types/agent";
import type { ChannelConnection } from "@agentxjs/types/network";
import { WebSocketServer } from "@agentxjs/network";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agentx/LocalAgentX");

export async function createLocalAgentX(config: LocalConfig): Promise<AgentX> {
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
  const { createRuntime, RuntimeEnvironment } = await import("@agentxjs/runtime");
  const { createPersistence } = await import("@agentxjs/persistence");
  const { sqliteDriver } = await import("@agentxjs/persistence/sqlite");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");

  // Configure global runtime environment if provided
  if (config.environment?.claudeCodePath) {
    RuntimeEnvironment.setClaudeCodePath(config.environment.claudeCodePath);
  }

  // Determine base path for runtime data
  const basePath = config.agentxDir ?? join(homedir(), ".agentx");

  // Auto-configure storage: SQLite at {agentxDir}/data/agentx.db
  const storagePath = join(basePath, "data", "agentx.db");
  const persistence = await createPersistence(sqliteDriver({ path: storagePath }));

  // Create event queue for pub/sub and reconnection recovery
  // Queue is decoupled from network protocol - we hook Network ACK to Queue ACK
  const { createQueue } = await import("@agentxjs/queue");
  const queuePath = join(basePath, "data", "queue.db");
  const eventQueue = createQueue({ path: queuePath });

  const runtime = createRuntime({
    persistence,
    basePath,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.llm?.apiKey ?? "",
        baseUrl: config.llm?.baseUrl,
        model: config.llm?.model,
      }),
    },
    environmentFactory: config.environmentFactory,
    defaultAgent: config.defaultAgent,
  });

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    heartbeat: true,
    heartbeatInterval: 30000,
    debug: false,
  });

  // Track active connections and their subscribed sessions
  const connections = new Map<
    string,
    {
      connection: ChannelConnection;
      subscribedSessions: Set<string>;
    }
  >();

  // Subscribe to queue topics and deliver to clients
  // This is set up per-connection when client subscribes to a session
  function subscribeConnectionToTopic(connectionId: string, topic: string): void {
    const connState = connections.get(connectionId);
    if (!connState) return;

    // Already subscribed?
    if (connState.subscribedSessions.has(topic)) return;
    connState.subscribedSessions.add(topic);

    // Subscribe to queue for this topic
    const unsubscribe = eventQueue.subscribe(topic, (entry) => {
      const event = entry.event as SystemEvent;
      const message = JSON.stringify(event);

      connState.connection.sendReliable(message, {
        onAck: () => {
          // Hook: Network ACK → Queue ACK
          eventQueue.ack(connectionId, topic, entry.cursor).catch((err) => {
            logger.error("Failed to ack", { error: (err as Error).message });
          });
          // Persist message after client confirms receipt
          persistMessage(event);
        },
        timeout: 10000,
        onTimeout: () => {
          logger.warn("ACK timeout for event", {
            connectionId,
            eventType: event.type,
            topic,
          });
        },
      });
    });

    // Cleanup on disconnect
    connState.connection.onClose(() => {
      unsubscribe();
    });

    logger.debug("Connection subscribed to queue topic", { connectionId, topic });
  }

  // Handle new connections
  wsServer.onConnection((connection) => {
    // Track this connection
    connections.set(connection.id, {
      connection,
      subscribedSessions: new Set(),
    });

    logger.info("Client connected", { connectionId: connection.id });

    // Subscribe to global topic by default
    subscribeConnectionToTopic(connection.id, "global");

    // Forward messages to runtime
    connection.onMessage((message) => {
      try {
        const parsed = JSON.parse(message);

        // Handle session subscription request (simplified protocol)
        if (parsed.type === "subscribe" && parsed.sessionId) {
          subscribeConnectionToTopic(connection.id, parsed.sessionId);

          // Send historical events for reconnection recovery
          const lastCursor = parsed.afterCursor;
          if (lastCursor) {
            eventQueue
              .recover(parsed.sessionId, lastCursor)
              .then((entries) => {
                for (const entry of entries) {
                  connection.send(JSON.stringify(entry.event));
                }
              })
              .catch((err) => {
                logger.error("Failed to recover history", { error: (err as Error).message });
              });
          }
          return;
        }

        // Regular event - forward to runtime
        const event = parsed as SystemEvent;
        logger.debug("Received client message", {
          type: event.type,
          category: event.category,
        });
        runtime.emit(event);
      } catch {
        // Ignore parse errors
      }
    });

    // Cleanup on disconnect
    connection.onClose(() => {
      connections.delete(connection.id);
      logger.info("Client disconnected", { connectionId: connection.id });
    });
  });

  /**
   * Determine if an event should be enqueued for external delivery
   *
   * Internal events (not enqueued):
   * - source: "environment" → DriveableEvent (raw LLM events for BusDriver)
   * - intent: "request" → Control events (user_message, interrupt)
   *
   * External events (enqueued):
   * - source: "agent" → Transformed events from BusPresenter
   * - source: "session" → Session lifecycle
   * - source: "command" → Request/Response
   */
  function shouldEnqueue(event: SystemEvent): boolean {
    if (event.source === "environment") return false;
    if (event.intent === "request") return false;
    return true;
  }

  /**
   * Persist message to session storage
   */
  function persistMessage(event: SystemEvent): void {
    if (event.category !== "message" || !event.data) return;

    const sessionId = (event.context as any)?.sessionId;
    if (!sessionId) return;

    const message = event.data as Message;
    logger.debug("Persisting message on ACK", {
      sessionId,
      messageType: event.type,
      messageId: message.id,
    });

    persistence.sessions.addMessage(sessionId, message).catch((err) => {
      logger.error("Failed to persist message", {
        sessionId,
        error: (err as Error).message,
      });
    });
  }

  // Route runtime events to Queue for pub/sub
  runtime.onAny((event) => {
    // Only deliver external events (internal events are for BusDriver/AgentEngine only)
    if (!shouldEnqueue(event)) {
      return;
    }

    // Determine topic from event context (sessionId or "global")
    const topic = (event.context as any)?.sessionId ?? "global";

    // Publish to queue (broadcasts to subscribers + persists async)
    eventQueue.publish(topic, event);
  });

  // If server is provided, attach WebSocket to it immediately
  if (config.server) {
    wsServer.attach(config.server, "/ws");
  }

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => {
      // Local mode filters by event source (not broadcastable)
      // Only deliver external events (source: agent/session/command)
      return runtime.on(type, (event) => {
        // Skip internal events (DriveableEvent, control events)
        if (!shouldEnqueue(event)) {
          return;
        }
        handler(event);
      });
    },

    onCommand: (type, handler) => runtime.onCommand(type, handler),

    emitCommand: (type, data) => runtime.emitCommand(type, data),

    // Server API
    async listen(port: number, host?: string) {
      if (config.server) {
        throw new Error(
          "Cannot listen when attached to existing server. The server should call listen() instead."
        );
      }
      await wsServer.listen(port, host);
    },

    async close() {
      await wsServer.close();
    },

    async dispose() {
      await eventQueue.close();
      await wsServer.dispose();
      await runtime.dispose();
    },
  };
}
