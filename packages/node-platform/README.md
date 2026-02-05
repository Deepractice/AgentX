# @agentxjs/node-platform

Node.js platform for AgentX. Supplies concrete implementations of persistence, bash, network, message queue, and logging for server-side environments. The platform assembles these components into an `AgentXPlatform` that can be passed to the AgentX runtime.

## Installation

```bash
bun add @agentxjs/node-platform
```

## Quick Start

```typescript
import { createNodePlatform } from "@agentxjs/node-platform";

const platform = await createNodePlatform({
  dataPath: "./data",
});

// platform.containerRepository  - SQLite-backed container storage
// platform.imageRepository      - SQLite-backed image storage
// platform.sessionRepository    - SQLite-backed session storage
// platform.eventBus             - In-memory event bus
// platform.bashProvider         - Shell command execution (execa)
```

### Deferred Initialization

Use `nodePlatform()` when you need lazy initialization, for example when passing configuration to a server factory:

```typescript
import { nodePlatform } from "@agentxjs/node-platform";

const config = nodePlatform({ dataPath: "./data" });

// Platform is not created until resolve() is called
const platform = await config.resolve();
```

## Configuration

### NodePlatformOptions

| Option     | Type       | Default    | Description                                                    |
|------------|------------|------------|----------------------------------------------------------------|
| `dataPath` | `string`   | `"./data"` | Base directory for all data storage (SQLite database) |
| `logDir`   | `string`   | --         | Directory for log files. If provided, enables file logging instead of console output |
| `logLevel` | `LogLevel` | `"debug"` (file) / `"info"` (console) | Log verbosity: `"debug"`, `"info"`, `"warn"`, `"error"`, or `"silent"` |

```typescript
const platform = await createNodePlatform({
  dataPath: "./data",
  logDir: ".agentx/logs",
  logLevel: "info",
});
```

When `logDir` is specified, all log output is written to `<logDir>/app.log`. You can monitor logs in real time:

```bash
tail -f .agentx/logs/app.log
```

## Components

### Persistence

SQLite-backed repositories for containers, images, and sessions. Built on [unstorage](https://unstorage.unjs.io/) with a custom SQLite driver powered by `commonxjs/sqlite` for cross-runtime support (Bun via `bun:sqlite`, Node.js 22+ via `node:sqlite`).

```typescript
import { createPersistence, sqliteDriver, memoryDriver } from "@agentxjs/node-platform/persistence";

// SQLite persistence (production)
const persistence = await createPersistence(
  sqliteDriver({ path: "./data/agentx.db" })
);

// In-memory persistence (testing)
const persistence = await createPersistence(memoryDriver());

// Repositories
await persistence.containers.saveContainer(record);
await persistence.containers.findContainerById("container-1");
await persistence.containers.findAllContainers();

await persistence.images.saveImage(imageRecord);
await persistence.images.findImagesByName("Assistant");
await persistence.images.findImagesByContainerId("container-1");

await persistence.sessions.saveSession(sessionRecord);
await persistence.sessions.addMessage(sessionId, message);
await persistence.sessions.getMessages(sessionId);
```

**Repositories provided:**

- `StorageContainerRepository` -- CRUD operations for container records
- `StorageImageRepository` -- CRUD operations for image records with secondary indexes by name and container
- `StorageSessionRepository` -- CRUD operations for session records with message storage and indexes by image and container

**Drivers:**

- `sqliteDriver({ path })` -- Persistent storage using SQLite. Auto-creates parent directories. Uses WAL mode for the message queue schema.
- `memoryDriver()` -- Ephemeral in-memory storage for testing. Data is lost when the process exits.

### Bash

`NodeBashProvider` executes shell commands using [execa](https://github.com/sindresorhus/execa). It implements the `BashProvider` interface from `@agentxjs/core/bash`.

```typescript
import { NodeBashProvider } from "@agentxjs/node-platform";

const bash = new NodeBashProvider();

const result = await bash.execute("echo hello", {
  cwd: "/tmp",
  timeout: 10000,
});

console.log(result.stdout);   // "hello\n"
console.log(result.exitCode); // 0
```

When `createNodePlatform()` is called, a `NodeBashProvider` is automatically created and included in the returned `AgentXPlatform.bashProvider`. The runtime then uses `createBashTool()` to wrap it into a `ToolDefinition` and inject it into every agent's driver — so agents can execute shell commands via LLM tool calling out of the box.

**Key characteristics:**

- Uses `execa` with `shell: true` for full shell syntax support (pipes, redirects, etc.)
- `reject: false` — command failures are reported via `exitCode`, never thrown
- Default timeout: 30 seconds (configurable per call)
- Supports `cwd` and `env` options

### Network

WebSocket server and connection management built on the `ws` library. Implements the `ChannelServer` and `ChannelConnection` interfaces from `@agentxjs/core`.

```typescript
import { WebSocketServer } from "@agentxjs/node-platform/network";

const server = new WebSocketServer({ heartbeat: true, heartbeatInterval: 30000 });

// Standalone mode -- listen on a port
await server.listen(5200);

// Or attach to an existing HTTP server
server.attach(httpServer, "/ws");

// Handle connections
server.onConnection((connection) => {
  console.log("Connected:", connection.id);

  connection.onMessage((message) => {
    console.log("Received:", message);
  });

  // Fire-and-forget send
  connection.send(JSON.stringify({ type: "hello" }));

  // Reliable delivery with ACK confirmation
  connection.sendReliable(JSON.stringify({ type: "event", data: "important" }), {
    onAck: () => console.log("Client confirmed receipt"),
    timeout: 5000,
    onTimeout: () => console.log("No ACK received within timeout"),
  });

  connection.onClose(() => {
    console.log("Disconnected:", connection.id);
  });
});

// Broadcast to all connected clients
server.broadcast(JSON.stringify({ type: "announcement" }));

// Shutdown
await server.close();
```

**WebSocketServer** supports two modes:

- **Standalone** -- Call `listen(port, host?)` to start a new WebSocket server
- **Attached** -- Call `attach(httpServer, path?)` to handle WebSocket upgrades on an existing HTTP server (`noServer` mode)

**WebSocketConnection** features:

- **Heartbeat** -- Automatic ping/pong with configurable interval. Terminates unresponsive clients.
- **Reliable delivery** -- `sendReliable()` wraps messages with a `__msgId`, waits for the client to respond with `__ack`, and triggers `onAck` or `onTimeout` callbacks.
- **Event handlers** -- `onMessage`, `onClose`, `onError` with unsubscribe support.

### Message Queue

`SqliteMessageQueue` combines RxJS-based in-memory pub/sub for real-time delivery with SQLite persistence for recovery after disconnections.

```typescript
import { SqliteMessageQueue } from "@agentxjs/node-platform/mq";

const queue = SqliteMessageQueue.create("./data/queue.db", {
  retentionMs: 86400000, // 24 hours (default)
});

// Subscribe to a topic (real-time, in-memory)
const unsubscribe = queue.subscribe("session-123", (entry) => {
  console.log(entry.offset, entry.event);
});

// Publish an event (persisted to SQLite + broadcast to subscribers)
const offset = await queue.publish("session-123", {
  type: "text_delta",
  data: { text: "Hello" },
});

// Acknowledge processing (update consumer position)
await queue.ack("connection-1", "session-123", offset);

// Recover missed events after reconnection
const lastOffset = await queue.getOffset("connection-1", "session-123");
const missed = await queue.recover("session-123", lastOffset ?? undefined);

// Cleanup
await queue.close();
```

**Key characteristics:**

- Real-time delivery through RxJS `Subject` (in-memory, zero latency)
- SQLite persistence for durability and recovery
- Consumer offset tracking for at-least-once delivery
- Automatic cleanup of old entries based on retention policy (default: 24 hours, checked every 5 minutes)
- WAL journal mode for concurrent read/write performance

**OffsetGenerator** produces monotonically increasing, lexicographically sortable offsets in the format `{timestamp_base36}-{sequence}` (e.g., `lq5x4g2-0001`).

### Logger

`FileLoggerFactory` writes structured log output to a file, useful for TUI applications or production deployments where console output is not practical.

```typescript
import { FileLoggerFactory } from "@agentxjs/node-platform";
import { setLoggerFactory } from "commonxjs/logger";

const factory = new FileLoggerFactory({
  logDir: ".agentx/logs",
  level: "info",
  filename: "app.log", // default
});

// Register as the global logger factory
setLoggerFactory(factory);
```

Log format:

```
2025-01-15T10:30:00.000Z INFO  [node-platform/WebSocketServer] WebSocket server listening {"port":5200,"host":"0.0.0.0"}
```

When using `createNodePlatform` with `logDir` set, file logging is configured automatically.

## API Reference

### createNodePlatform(options?)

Creates and returns an `AgentXPlatform` with all components initialized. This is the primary entry point.

```typescript
function createNodePlatform(options?: NodePlatformOptions): Promise<AgentXPlatform>
```

The returned `AgentXPlatform` contains:

| Property                | Type                        | Description                     |
|-------------------------|-----------------------------|---------------------------------|
| `containerRepository`   | `ContainerRepository`       | Container CRUD operations       |
| `imageRepository`       | `ImageRepository`           | Image CRUD operations           |
| `sessionRepository`     | `SessionRepository`         | Session and message operations  |
| `eventBus`              | `EventBus`                  | In-memory event pub/sub         |
| `bashProvider`          | `BashProvider`              | Shell command execution (execa) |

The platform handles persistence, bash, and event bus concerns only. The AI driver (e.g., Claude) is injected separately at the runtime level.

### nodePlatform(options?)

Creates a deferred platform configuration. The platform is not initialized until `resolve()` is called.

```typescript
function nodePlatform(options?: NodePlatformOptions): DeferredPlatformConfig
```

```typescript
const deferred = nodePlatform({ dataPath: "./data" });

// Later, when needed:
const platform = await deferred.resolve();
```

### isDeferredPlatform(value)

Type guard to check whether a value is a `DeferredPlatformConfig`.

```typescript
function isDeferredPlatform(value: unknown): value is DeferredPlatformConfig
```

## Sub-path Exports

The package exposes additional entry points for direct access to individual modules:

| Import path                         | Exports                                          |
|-------------------------------------|--------------------------------------------------|
| `@agentxjs/node-platform`           | Everything (main entry)                          |
| `@agentxjs/node-platform/persistence` | `createPersistence`, `sqliteDriver`, `memoryDriver`, repository classes |
| `@agentxjs/node-platform/mq`       | `SqliteMessageQueue`, `OffsetGenerator`          |
| `@agentxjs/node-platform/network`  | `WebSocketServer`, `WebSocketConnection`         |

## Dependencies

- `@agentxjs/core` -- Core interfaces (`ContainerRepository`, `ImageRepository`, `SessionRepository`, `BashProvider`, `EventBus`, `ChannelServer`, `MessageQueue`)
- `execa` -- Subprocess execution with timeout, shell support, and cross-platform compatibility
- `commonxjs` -- Cross-runtime SQLite and logging utilities
- `rxjs` -- Reactive streams for in-memory pub/sub
- `unstorage` -- Backend-agnostic key-value storage abstraction
- `ws` -- WebSocket implementation for Node.js

## License

See the repository root for license information.
