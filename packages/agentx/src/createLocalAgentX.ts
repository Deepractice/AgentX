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

  // Create event queue for storage and reconnection recovery
  // Note: Queue no longer handles client protocol - Network layer ACK is used instead
  const { createQueue } = await import("@agentxjs/queue");
  const queuePath = join(basePath, "data", "queue.db");
  const eventQueue = await createQueue({ path: queuePath });

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

  // Handle new connections
  wsServer.onConnection((connection) => {
    // Track this connection
    connections.set(connection.id, {
      connection,
      subscribedSessions: new Set(["global"]), // Always subscribe to global
    });

    logger.info("Client connected", { connectionId: connection.id });

    // Forward messages to runtime
    connection.onMessage((message) => {
      try {
        const parsed = JSON.parse(message);

        // Handle session subscription request (simplified protocol)
        if (parsed.type === "subscribe" && parsed.sessionId) {
          const connState = connections.get(connection.id);
          if (connState) {
            connState.subscribedSessions.add(parsed.sessionId);
            logger.debug("Client subscribed to session", {
              connectionId: connection.id,
              sessionId: parsed.sessionId,
            });

            // TODO: Send historical events from Queue for reconnection recovery
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

  // Route runtime events to connected clients via reliable delivery
  runtime.onAny((event) => {
    // Only deliver external events (internal events are for BusDriver/AgentEngine only)
    if (!shouldEnqueue(event)) {
      return;
    }

    // Determine topic from event context (sessionId or "global")
    const topic = (event.context as any)?.sessionId ?? "global";

    // Log event for debugging
    logger.debug("Delivering event", {
      type: event.type,
      category: event.category,
      topic,
    });

    // Store in queue for reconnection recovery
    eventQueue.append(topic, event).catch((err) => {
      logger.error("Failed to store event in queue", { error: (err as Error).message });
    });

    // Send to all connections subscribed to this topic using reliable delivery
    const message = JSON.stringify(event);
    for (const [connId, connState] of connections) {
      if (connState.subscribedSessions.has(topic)) {
        connState.connection.sendReliable(message, {
          onAck: () => {
            // Persist message after client confirms receipt
            persistMessage(event);
          },
          timeout: 10000,
          onTimeout: () => {
            logger.warn("ACK timeout for event", {
              connectionId: connId,
              eventType: event.type,
              topic,
            });
          },
        });
      }
    }
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
