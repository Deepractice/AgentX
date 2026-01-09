/**
 * createLocalAgentX - Local mode implementation
 *
 * This file is dynamically imported to enable tree-shaking in browser builds.
 * Contains Node.js specific code (runtime, WebSocket server).
 */

import type { AgentX, LocalConfig } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";
import type { ChannelConnection } from "@agentxjs/types/network";
import type { QueueSubscribeRequest, QueueAckRequest } from "@agentxjs/types/queue";
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

  // Create event queue for reliable delivery
  const { createQueue } = await import("@agentxjs/queue");
  const queuePath = join(basePath, "data", "queue.db");
  const eventQueue = await createQueue({ path: queuePath });

  // Track client subscriptions: connectionId -> { topic -> unsubscribe }
  const clientSubscriptions = new Map<string, Map<string, () => void>>();

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
    defaultAgent: config.defaultAgent,
  });

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    heartbeat: true,
    heartbeatInterval: 30000,
    debug: false,
  });

  // Queue protocol handlers
  async function handleQueueSubscribe(
    connection: ChannelConnection,
    request: QueueSubscribeRequest
  ) {
    const { topic, afterCursor } = request;

    // Send historical entries if cursor provided (reconnection recovery)
    if (afterCursor) {
      const missed = await eventQueue.read(topic, afterCursor, 1000);
      for (const entry of missed) {
        connection.send(
          JSON.stringify({
            type: "queue_entry",
            topic: entry.topic,
            cursor: entry.cursor,
            event: entry.event,
            timestamp: entry.timestamp,
          })
        );
      }
    }

    // Subscribe to new entries
    const unsubscribe = eventQueue.subscribe(topic, (entry) => {
      connection.send(
        JSON.stringify({
          type: "queue_entry",
          topic: entry.topic,
          cursor: entry.cursor,
          event: entry.event,
          timestamp: entry.timestamp,
        })
      );
    });

    // Store subscription for cleanup
    const subs = clientSubscriptions.get(connection.id);
    if (subs) {
      // Unsubscribe from previous subscription to same topic
      subs.get(topic)?.();
      subs.set(topic, unsubscribe);
    }

    // Send confirmation with latest cursor
    const latestCursor = await eventQueue.getLatestCursor(topic);
    connection.send(
      JSON.stringify({
        type: "queue_subscribed",
        topic,
        latestCursor,
      })
    );

    logger.debug("Client subscribed to queue", {
      connectionId: connection.id,
      topic,
      afterCursor,
    });
  }

  async function handleQueueAck(request: QueueAckRequest) {
    await eventQueue.ack(request.topic, request.cursor);
  }

  function handleQueueUnsubscribe(connection: ChannelConnection, topic: string) {
    const subs = clientSubscriptions.get(connection.id);
    if (subs) {
      subs.get(topic)?.();
      subs.delete(topic);
    }
    logger.debug("Client unsubscribed from queue", {
      connectionId: connection.id,
      topic,
    });
  }

  // Handle new connections
  wsServer.onConnection((connection) => {
    // Initialize subscription map for this connection
    clientSubscriptions.set(connection.id, new Map());

    // Forward client messages to runtime
    connection.onMessage((message) => {
      try {
        const parsed = JSON.parse(message);

        // Handle queue protocol messages
        if (parsed.type === "queue_subscribe") {
          handleQueueSubscribe(connection, parsed as QueueSubscribeRequest);
          return;
        }

        if (parsed.type === "queue_ack") {
          handleQueueAck(parsed as QueueAckRequest);
          return;
        }

        if (parsed.type === "queue_unsubscribe") {
          handleQueueUnsubscribe(connection, parsed.topic);
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

    // Cleanup subscriptions on disconnect
    connection.onClose(() => {
      const subs = clientSubscriptions.get(connection.id);
      if (subs) {
        for (const unsubscribe of subs.values()) {
          unsubscribe();
        }
        clientSubscriptions.delete(connection.id);
      }
    });
  });

  // Route runtime events through queue for reliable delivery
  runtime.onAny((event) => {
    // Skip non-broadcastable events (internal events like DriveableEvent)
    if ((event as any).broadcastable === false) {
      return;
    }

    // Determine topic from event context (sessionId or "global")
    const topic = (event.context as any)?.sessionId ?? "global";

    // Log event for debugging
    logger.debug("Enqueueing event", {
      type: event.type,
      category: event.category,
      topic,
    });

    // Append to queue - subscribers will be notified automatically
    eventQueue.append(topic, event).catch((err) => {
      logger.error("Failed to enqueue event", { error: (err as Error).message });
    });
  });

  // If server is provided, attach WebSocket to it immediately
  if (config.server) {
    wsServer.attach(config.server, "/ws");
  }

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => runtime.on(type, handler),

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
