/**
 * createLocalAgentX - Local mode implementation
 *
 * This file is dynamically imported to enable tree-shaking in browser builds.
 * Contains Node.js specific code (runtime, WebSocket server).
 */

import type { AgentX, LocalConfig } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";
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

  // Handle new connections
  wsServer.onConnection((connection) => {
    // Let queue handle its protocol messages (subscribe/ack/unsubscribe)
    const cleanupQueue = eventQueue.handleConnection(connection);

    // Forward non-queue messages to runtime
    connection.onMessage((message) => {
      try {
        const parsed = JSON.parse(message);

        // Skip queue protocol messages (handled by eventQueue.handleConnection)
        if (
          parsed.type === "queue_subscribe" ||
          parsed.type === "queue_ack" ||
          parsed.type === "queue_unsubscribe"
        ) {
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
      cleanupQueue();
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
