# @agentxjs/core

Core type definitions, interfaces, and implementations for the AgentX framework. This package serves as the foundational layer that all other AgentX packages depend on. It defines the contracts (interfaces and types) for drivers, runtime, platform, agents, events, sessions, images, containers, bash, networking, message queues, and persistence -- without coupling to any specific platform or LLM provider.

## Installation

```bash
bun add @agentxjs/core
```

## Architecture Overview

`@agentxjs/core` is organized into submodules, each accessible via its own subpath export. The package follows a clean separation between **interface definitions** (contracts) and **platform implementations** (provided by other packages like `@agentxjs/node-platform` or `@agentxjs/cloudflare`).

```
@agentxjs/core
├── common       Re-exported logger utilities from commonxjs
├── driver       LLM communication interfaces (Driver, DriverConfig, ToolDefinition, StreamEvent)
├── bash         Command execution abstraction (BashProvider) + tool factory
├── platform     AgentXPlatform: dependency injection container for platform capabilities
├── agent        Agent engine: event processing, Mealy machine, state management
├── event        Central EventBus system with typed pub/sub
├── session      Conversation message management
├── image        Persistent conversation entities
├── container    Resource isolation units
├── runtime      AgentXRuntime: orchestrates agent lifecycle
├── network      Transport-agnostic channel interfaces + JSON-RPC 2.0
├── mq           Message queue interfaces for reliable delivery
├── persistence  Repository interfaces (Container, Image, Session)
└── .            Root export: re-exports common + agent
```

### Dependency Flow

```
persistence (repository interfaces)
     |
     +---> container ---> image ---> session
     |                      |           |
     +----------------------+-----------+
                            |
driver (LLM interface) ----+----> runtime (orchestration)
                            |
agent (event processor) ----+
     |
event (EventBus) -----------+
```

## Submodule Guide

### `@agentxjs/core/driver`

Defines the interface for communicating with LLM providers (Claude, OpenAI, etc.). The Driver is a single-session communication bridge between AgentX and an external LLM.

**Key types:**
- `Driver` -- LLM communication interface with lifecycle (`initialize`, `receive`, `interrupt`, `dispose`)
- `CreateDriver` -- Factory function type for creating Driver instances
- `DriverConfig<TOptions>` -- Configuration including API key, model, system prompt, MCP servers, tools
- `ToolDefinition` -- Tool definition with JSON Schema parameters and execute function
- `DriverStreamEvent` -- Union of all stream events from the Driver
- `StreamEvent<T, D>` -- Base stream event with type, timestamp, and data
- `McpServerConfig` -- MCP server process configuration

**Stream event types:** `MessageStartEvent`, `MessageStopEvent`, `TextDeltaEvent`, `ToolUseStartEvent`, `InputJsonDeltaEvent`, `ToolUseStopEvent`, `ToolResultEvent`, `ErrorEvent`, `InterruptedEvent`

```typescript
import type { Driver, CreateDriver, DriverConfig, DriverStreamEvent } from "@agentxjs/core/driver";

// Define a custom driver factory
const createMyDriver: CreateDriver = (config: DriverConfig) => {
  return new MyDriver(config);
};

// Use the driver
const driver = createMyDriver({
  apiKey: "sk-xxx",
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant",
  model: "claude-sonnet-4-20250514",
  tools: [myTool],                   // Explicit tool definitions (optional)
  mcpServers: {                      // MCP servers for tool discovery (optional)
    filesystem: {                    // Stdio — local subprocess
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    },
    remote: {                        // HTTP Streamable — remote server
      type: "http",
      url: "https://mcp.example.com/mcp",
      headers: { Authorization: "Bearer token" },
    },
  },
});

await driver.initialize();

const message = { id: "msg_1", role: "user" as const, subtype: "user" as const, content: "Hello!", timestamp: Date.now() };
for await (const event of driver.receive(message)) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

---

### `@agentxjs/core/runtime`

The orchestration layer that integrates all components for agent lifecycle management. `AgentXRuntime` coordinates Driver, EventBus, and repositories.

**Key types:**
- `AgentXRuntime` -- Runtime interface for agent lifecycle, messaging, and event subscription
- `AgentXPlatform` -- Dependency injection container (re-exported from `@agentxjs/core/platform`)
- `CreateAgentXRuntime` -- Factory function type
- `RuntimeAgent` -- Active agent instance metadata
- `CreateAgentOptions` -- Options for creating agents (imageId, optional agentId)
- `AgentLifecycle` -- Agent lifecycle states: `"running" | "stopped" | "destroyed"`
- `Subscription` -- Handle for unsubscribing from events

**Important:** `createAgentXRuntime` takes `platform` and `createDriver` as **separate** parameters. `AgentXPlatform` does **not** contain `createDriver`.

```typescript
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import type { AgentXPlatform, AgentXRuntime } from "@agentxjs/core/runtime";
import type { CreateDriver } from "@agentxjs/core/driver";

// Platform provides the implementation
const platform: AgentXPlatform = {
  containerRepository,
  imageRepository,
  sessionRepository,
  eventBus,
  bashProvider, // optional
};

const createDriver: CreateDriver = (config) => new MyLLMDriver(config);

// Create runtime with platform AND createDriver as separate params
const runtime: AgentXRuntime = createAgentXRuntime(platform, createDriver);

// Create an agent from an image
const agent = await runtime.createAgent({ imageId: "img_xxx" });

// Send a message
await runtime.receive(agent.agentId, "Hello!");

// Subscribe to events
const sub = runtime.subscribe(agent.agentId, (event) => {
  console.log(event.type, event.data);
});

// Cleanup
sub.unsubscribe();
await runtime.destroyAgent(agent.agentId);
await runtime.shutdown();
```

---

### `@agentxjs/core/agent`

The agent engine -- an event processing unit for AI conversations. It processes LLM stream events through a Mealy machine to produce structured output events (state changes, assembled messages, turn analytics).

**Key types:**
- `AgentEngine` -- Event processing unit with `receive()`, `on()`, `react()`, state management
- `CreateAgentOptions` -- Factory options (agentId, bus, source, presenter)
- `AgentSource` / `AgentPresenter` -- Input/output adapters for EventBus integration
- `MealyMachine` -- Pure stateless event transformer (StreamEvent -> AgentOutput)
- `AgentStateMachine` -- Tracks conversation state transitions
- `AgentMiddleware` / `AgentInterceptor` -- Middleware for input/output processing

**Message types:** `UserMessage`, `AssistantMessage`, `ToolCallMessage`, `ToolResultMessage`, `ErrorMessage`

**Content parts:** `TextPart`, `ThinkingPart`, `ImagePart`, `FilePart`, `ToolCallPart`, `ToolResultPart`

```typescript
import { createAgent, type AgentEngine } from "@agentxjs/core/agent";

const agent: AgentEngine = createAgent({
  agentId: "agent-1",
  bus: eventBus,
});

// Subscribe to events
agent.on("text_delta", (event) => {
  console.log(event.data.text);
});

// Or use React-style handlers
agent.react({
  onTextDelta: (event) => process.stdout.write(event.data.text),
  onAssistantMessage: (event) => console.log("Complete:", event.data.content),
});

// Track state changes
agent.onStateChange(({ prev, current }) => {
  console.log(`State: ${prev} -> ${current}`);
});

// Add middleware
agent.use(async (message, next) => {
  console.log("Incoming:", message.content);
  await next(message);
});

// Send a message
await agent.receive("Hello!");

// Cleanup
await agent.destroy();
```

---

### `@agentxjs/core/event`

Central event bus system for ecosystem communication. Provides type-safe pub/sub event handling backed by RxJS.

**Key types:**
- `EventBus` -- Full-access event bus (emit + subscribe)
- `EventProducer` -- Write-only view (emit only)
- `EventConsumer` -- Read-only view (subscribe only)
- `BusEvent` -- Base event type with type, timestamp, data
- `SystemEvent` -- Rich event with source, category, intent, context
- `EventContext` -- Scope information (containerId, imageId, agentId, sessionId)

**Event categories by source:**
- **Driver events:** `DriveableEvent` (LLM stream), `ConnectionEvent` (network status)
- **Agent events:** `AgentStreamEvent`, `AgentStateEvent`, `AgentMessageEvent`, `AgentTurnEvent`
- **Session events:** `SessionLifecycleEvent`, `SessionPersistEvent`, `SessionActionEvent`
- **Container events:** `ContainerLifecycleEvent`, `WorkdirEvent`, `MCPEvent`
- **Command events:** `CommandRequest`, `CommandResponse` (typed request/response pairs)

```typescript
import { EventBusImpl, type EventBus, type BusEvent } from "@agentxjs/core/event";

const bus: EventBus = new EventBusImpl();

// Subscribe to specific event type
bus.on("text_delta", (event) => {
  console.log("Text:", event.data);
});

// Subscribe to all events
bus.onAny((event) => {
  console.log("Event:", event.type);
});

// Subscribe with filtering and priority
bus.on("text_delta", handler, {
  filter: (e) => (e as any).context?.agentId === "agent-1",
  priority: 10,
});

// Type-safe command handling
bus.onCommand("message_send_request", (event) => {
  console.log("Send message:", event.data.content);
});

// Request/response pattern
const response = await bus.request("container_create_request", {
  containerId: "my-container",
});

// Restricted views for component isolation
const producer = bus.asProducer(); // Can only emit
const consumer = bus.asConsumer(); // Can only subscribe

// Cleanup
bus.destroy();
```

---

### `@agentxjs/core/session`

Manages conversation messages for an Image. Each Image has exactly one Session.

**Key types:**
- `Session` -- Interface for message management (addMessage, getMessages, clear)
- `SessionConfig` -- Configuration for creating a session
- `SessionRecord` -- Storage schema (re-exported from persistence)
- `SessionRepository` -- Storage operations (re-exported from persistence)

```typescript
import { createSession, type Session } from "@agentxjs/core/session";

const session: Session = createSession({
  sessionId: "sess_abc",
  imageId: "img_xyz",
  containerId: "ctr_123",
  repository: mySessionRepository,
});

await session.initialize();
await session.addMessage(userMessage);
const messages = await session.getMessages();
await session.clear();
```

---

### `@agentxjs/core/image`

Manages persistent conversation entities. An Image is the primary entity users interact with (displayed as a "conversation"). Agents are transient runtime instances created from Images.

**Key types:**
- `Image` -- Persistent conversation entity with update/delete methods
- `ImageRecord` -- Storage schema (imageId, containerId, sessionId, name, systemPrompt, etc.)
- `ImageRepository` -- Storage operations (re-exported from persistence)
- `ImageContext` -- Dependencies needed by Image operations
- `ImageCreateConfig` -- Configuration for creating a new Image

**Lifecycle:** `create() -> ImageRecord (persistent)` | `run() -> Agent (runtime)` | `stop() -> Agent destroyed, Image remains`

```typescript
import { createImage, loadImage, type Image } from "@agentxjs/core/image";

const context = {
  imageRepository: myImageRepository,
  sessionRepository: mySessionRepository,
};

// Create a new image (also creates associated session)
const image: Image = await createImage({
  containerId: "ctr_123",
  name: "My Conversation",
  systemPrompt: "You are a helpful assistant",
}, context);

console.log(image.imageId);   // "img_xxx"
console.log(image.sessionId); // "sess_yyy"

// Load existing
const existing = await loadImage("img_xxx", context);

// Update
const updated = await image.update({ name: "Renamed Conversation" });

// Delete (also deletes associated session)
await image.delete();
```

---

### `@agentxjs/core/container`

Manages resource isolation containers. Each container provides an isolated environment for Images and Agents.

**Key types:**
- `Container` -- Resource isolation unit with update/delete methods
- `ContainerRecord` -- Storage schema
- `ContainerRepository` -- Storage operations (re-exported from persistence)
- `ContainerContext` -- Dependencies needed by Container operations
- `ContainerCreateConfig` -- Configuration for creating a new Container

```typescript
import {
  createContainer,
  loadContainer,
  getOrCreateContainer,
} from "@agentxjs/core/container";

const context = {
  containerRepository: myContainerRepository,
  imageRepository: myImageRepository,
  sessionRepository: mySessionRepository,
};

// Create
const container = await createContainer({ containerId: "user-123" }, context);

// Load
const existing = await loadContainer("user-123", context);

// Get or create (idempotent)
const container2 = await getOrCreateContainer("user-456", context);

// Delete (cascade deletes all images and sessions)
await container.delete();
```

---

### `@agentxjs/core/bash`

Abstraction for command execution capability. Different platforms provide different implementations (child_process, Docker exec, sandbox).

**Key types:**
- `BashProvider` -- Stateless command execution interface (`execute(command, options)`)
- `BashResult` -- Output with `stdout`, `stderr`, `exitCode`
- `BashOptions` -- Execution options (`cwd`, `timeout`, `env`)
- `createBashTool(provider)` -- Factory that wraps a BashProvider into a `ToolDefinition`

```typescript
import type { BashProvider } from "@agentxjs/core/bash";
import { createBashTool } from "@agentxjs/core/bash";

// Platform provides BashProvider implementation
const bash: BashProvider = platform.bashProvider;

// Direct usage
const result = await bash.execute("echo hello", { cwd: "/tmp" });
console.log(result.stdout);   // "hello\n"
console.log(result.exitCode); // 0

// As a tool for LLM (used by Runtime automatically)
const tool = createBashTool(bash);
// tool is a ToolDefinition ready for DriverConfig.tools
```

---

### `@agentxjs/core/platform`

Dependency injection container for platform capabilities. Platform packages (e.g., `@agentxjs/node-platform`) provide implementations.

**Key types:**
- `AgentXPlatform` -- Collects all platform dependencies (repositories, event bus, optional providers)

```typescript
import type { AgentXPlatform } from "@agentxjs/core/platform";

const platform: AgentXPlatform = {
  containerRepository,  // required
  imageRepository,      // required
  sessionRepository,    // required
  eventBus,             // required
  bashProvider,         // optional — not all platforms support shell execution
};
```

When `bashProvider` is present, `AgentXRuntime` automatically creates a bash tool and injects it into every agent's `DriverConfig.tools`.

---

### `@agentxjs/core/network`

Transport-agnostic interfaces for client-server communication, plus a reliable message delivery protocol and JSON-RPC 2.0 support.

**Key types:**
- `ChannelServer` -- Accepts client connections (`listen`, `attach`, `onConnection`, `broadcast`)
- `ChannelClient` -- Connects to server (`connect`, `send`, `onMessage`, `close`)
- `ChannelConnection` -- Server-side representation of a client with `send` and `sendReliable`
- `RpcClient` -- JSON-RPC 2.0 client over WebSocket with request/response and notifications
- `ReliableWrapper` / `AckMessage` -- Transparent at-least-once delivery protocol

**Protocol utilities:** `wrapMessage`, `createAck`, `unwrapMessage`, `isReliableWrapper`, `isAckMessage`

**JSON-RPC utilities:** `createRequest`, `createNotification`, `createSuccessResponse`, `createErrorResponse`, `parseMessage`

```typescript
import type { ChannelServer, ChannelConnection } from "@agentxjs/core/network";
import { RpcClient } from "@agentxjs/core/network";

// Server-side (platform provides ChannelServer implementation)
const server: ChannelServer = createWebSocketServer();
server.onConnection((conn: ChannelConnection) => {
  conn.onMessage((msg) => console.log("Received:", msg));

  // Reliable delivery with ACK
  conn.sendReliable(JSON.stringify({ type: "event" }), {
    onAck: () => console.log("Client confirmed receipt"),
    timeout: 5000,
    onTimeout: () => console.log("No ACK received"),
  });
});

// Client-side with JSON-RPC
const client = new RpcClient({ url: "ws://localhost:5200" });
await client.connect();

// RPC call (request/response)
const result = await client.call("container.list", {});

// Stream event subscription
client.onStreamEvent((topic, event) => {
  console.log(`[${topic}]`, event.type, event.data);
});

client.subscribe("session-123");
client.dispose();
```

---

### `@agentxjs/core/mq`

Standard interfaces for reliable message delivery with persistence guarantee. Provides in-memory pub/sub for real-time delivery and persistence for recovery.

**Key types:**
- `MessageQueue` -- Core queue interface (`publish`, `subscribe`, `ack`, `getOffset`, `recover`)
- `QueueEntry` -- A single entry with offset, topic, event, and timestamp
- `QueueConfig` -- Configuration (retentionMs, maxEntriesPerTopic)
- `MessageQueueProvider` -- Factory for platform-specific implementations
- `OffsetGenerator` -- Utility for generating monotonically increasing offsets

```typescript
import type { MessageQueue, QueueEntry } from "@agentxjs/core/mq";
import { OffsetGenerator } from "@agentxjs/core/mq";

// Platform provides the implementation
const queue: MessageQueue = await provider.createQueue({ retentionMs: 86400000 });

// Publish
const offset = await queue.publish("session-123", { type: "text_delta", data: { text: "Hi" } });

// Subscribe to real-time events
const unsub = queue.subscribe("session-123", (entry: QueueEntry) => {
  console.log(`[${entry.offset}]`, entry.event);
});

// ACK after processing
await queue.ack("connection-1", "session-123", offset);

// Recover missed events on reconnection
const lastOffset = await queue.getOffset("connection-1", "session-123");
const missed = await queue.recover("session-123", lastOffset ?? undefined);

// Offset comparison
const gen = new OffsetGenerator();
const a = gen.generate();
const b = gen.generate();
console.log(OffsetGenerator.compare(a, b)); // negative (a < b)

await queue.close();
```

---

### `@agentxjs/core/persistence`

Defines standard repository interfaces for data persistence. Implementations are provided by platform packages (`@agentxjs/node-platform` uses SQLite, `@agentxjs/cloudflare` uses Durable Objects).

**Key types:**
- `ContainerRepository` -- CRUD operations for containers
- `ImageRepository` -- CRUD operations for images (conversations)
- `SessionRepository` -- CRUD for sessions + message operations (addMessage, getMessages)
- `ContainerRecord`, `ImageRecord`, `SessionRecord` -- Storage schemas
- `ImageMetadata` -- Provider-specific metadata (e.g., `driverSessionId`)
- `McpServerConfig` -- MCP server configuration (re-exported from driver)

```typescript
import type {
  ContainerRepository,
  ImageRepository,
  SessionRepository,
  ImageRecord,
} from "@agentxjs/core/persistence";

// Implement for your platform
class SqliteImageRepository implements ImageRepository {
  async saveImage(record: ImageRecord): Promise<void> { /* ... */ }
  async findImageById(imageId: string): Promise<ImageRecord | null> { /* ... */ }
  async findAllImages(): Promise<ImageRecord[]> { /* ... */ }
  async findImagesByName(name: string): Promise<ImageRecord[]> { /* ... */ }
  async findImagesByContainerId(containerId: string): Promise<ImageRecord[]> { /* ... */ }
  async deleteImage(imageId: string): Promise<void> { /* ... */ }
  async imageExists(imageId: string): Promise<boolean> { /* ... */ }
  async updateMetadata(imageId: string, metadata: Partial<import("@agentxjs/core/persistence").ImageMetadata>): Promise<void> { /* ... */ }
}
```

---

### `@agentxjs/core/common`

Re-exports logger utilities from `commonxjs` for backward compatibility. Prefer importing directly from `commonxjs/logger`.

**Key exports:** `createLogger`, `setLoggerFactory`, and related logger types.

```typescript
import { createLogger } from "@agentxjs/core/common";

const logger = createLogger("mymodule/component");
logger.info("Something happened", { key: "value" });
logger.error("Error occurred", { error: err });
```

---

## Key Concepts

### Driver

A **Driver** is the bridge between AgentX and an external LLM (Claude, OpenAI, etc.). It handles single-session communication: accepting a `UserMessage` and returning an `AsyncIterable<DriverStreamEvent>`.

```
UserMessage --> Driver --> AsyncIterable<DriverStreamEvent>
                  |
            External LLM
```

Drivers are created via a `CreateDriver` factory function. Each driver implementation package (e.g., `@agentxjs/claude-driver`) exports its own factory.

**Driver lifecycle:** `createDriver(config)` -> `driver.initialize()` -> `driver.receive(message)` -> `driver.dispose()`

### Platform

`AgentXPlatform` is a dependency injection container that collects all platform-specific implementations needed by the runtime:

```typescript
interface AgentXPlatform {
  containerRepository: ContainerRepository;
  imageRepository: ImageRepository;
  sessionRepository: SessionRepository;
  eventBus: EventBus;
  bashProvider?: BashProvider; // optional
}
```

The platform is **separate** from the driver factory. `createAgentXRuntime` accepts both as distinct parameters.

### Runtime

`AgentXRuntime` is the orchestration layer that ties everything together. It:

1. Creates agents from images (loads image, assembles default tools, initializes driver)
2. Manages agent lifecycle (create, stop, resume, destroy)
3. Routes messages to drivers and processes stream events
4. Publishes events to the EventBus for subscribers

### Agent Lifecycle (Docker-Style)

AgentX follows a Docker-inspired lifecycle model:

```
Container --> Image --> Agent --> Session
(isolation)  (persistent) (transient) (messages)
```

- **Container**: Resource isolation boundary (like a Docker host)
- **Image**: Persistent conversation definition (like a Docker image)
- **Agent**: Running instance created from an image (like a Docker container)
- **Session**: Message storage associated with an image

### Event System (4-Layer Architecture)

Events flow through four layers, from raw LLM output to high-level analytics:

1. **Stream Layer** -- Real-time incremental events from the LLM
   - `message_start`, `text_delta`, `tool_use_start`, `input_json_delta`, `tool_use_stop`, `tool_result`, `message_stop`

2. **State Layer** -- Agent state transitions derived from stream events
   - `conversation_start`, `conversation_thinking`, `conversation_responding`, `conversation_end`
   - `tool_planned`, `tool_executing`, `tool_completed`, `tool_failed`
   - `error_occurred`

3. **Message Layer** -- Complete assembled messages
   - `user_message`, `assistant_message`, `tool_call_message`, `tool_result_message`, `error_message`

4. **Turn Layer** -- Turn-level analytics
   - `turn_request` (user message received), `turn_response` (assistant response completed with duration, usage, model)

### Mealy Machine Pattern

The agent engine uses a **Mealy Machine** pattern: `(state, input) -> (state, outputs)`. StreamEvents are processed through pure functions that:

- Transform incremental `text_delta` events into complete `AssistantMessage`s
- Track state transitions (`idle` -> `thinking` -> `responding` -> `idle`)
- Accumulate tool call JSON fragments into complete tool calls
- Generate turn analytics (duration, token usage)

This design enables:
- Pure functions, testable without mocks
- Composable processors via `combineProcessors`, `chainProcessors`
- Predictable state management

---

## Type Reference

### Core Interfaces

| Interface | Module | Description |
|-----------|--------|-------------|
| `Driver` | `driver` | LLM communication interface |
| `CreateDriver<TOptions>` | `driver` | Factory function for creating drivers |
| `DriverConfig<TOptions>` | `driver` | Configuration for driver creation |
| `ToolDefinition` | `driver` | Tool definition with schema and execute function |
| `AgentXRuntime` | `runtime` | Agent lifecycle and message orchestration |
| `AgentXPlatform` | `platform` | Dependency injection container |
| `BashProvider` | `bash` | Command execution interface |
| `RuntimeAgent` | `runtime` | Active agent instance metadata |
| `AgentEngine` | `agent` | Event processing unit |
| `EventBus` | `event` | Central pub/sub event bus |
| `EventProducer` | `event` | Write-only event bus view |
| `EventConsumer` | `event` | Read-only event bus view |
| `Session` | `session` | Conversation message management |
| `Image` | `image` | Persistent conversation entity |
| `Container` | `container` | Resource isolation unit |
| `ChannelServer` | `network` | Server that accepts connections |
| `ChannelClient` | `network` | Client that connects to server |
| `ChannelConnection` | `network` | Server-side client representation |
| `RpcClient` | `network` | JSON-RPC 2.0 client |
| `MessageQueue` | `mq` | Reliable message delivery queue |
| `ContainerRepository` | `persistence` | Container storage operations |
| `ImageRepository` | `persistence` | Image storage operations |
| `SessionRepository` | `persistence` | Session + message storage operations |

### Event Types

| Type | Source | Category | Description |
|------|--------|----------|-------------|
| `BusEvent` | -- | -- | Base event (type, timestamp, data) |
| `SystemEvent` | any | any | Rich event with source, category, intent, context |
| `DriveableEvent` | driver | stream | LLM stream events |
| `ConnectionEvent` | driver | connection | Network status events |
| `AgentStreamEvent` | agent | stream | Processed stream events |
| `AgentStateEvent` | agent | state | State transition events |
| `AgentMessageEvent` | agent | message | Assembled message events |
| `AgentTurnEvent` | agent | turn | Turn analytics events |
| `SessionEvent` | session | lifecycle/persist/action | Session operations |
| `ContainerEvent` | container | lifecycle | Container operations |
| `CommandEvent` | command | request/response | API operations |

### Record Types

| Type | Module | Description |
|------|--------|-------------|
| `ContainerRecord` | `persistence` | Persistent container data |
| `ImageRecord` | `persistence` | Persistent conversation data |
| `SessionRecord` | `persistence` | Session storage schema |
| `ImageMetadata` | `persistence` | Provider-specific metadata |
| `McpServerConfig` | `driver` | MCP server process configuration |

### Message Types

| Type | Role | Description |
|------|------|-------------|
| `UserMessage` | user | Message sent by the user |
| `AssistantMessage` | assistant | AI-generated response |
| `ToolCallMessage` | assistant | AI's request to invoke a tool |
| `ToolResultMessage` | tool | Result of tool execution |
| `ErrorMessage` | error | Error displayed in chat |

---

## Dependencies

- `commonxjs` -- Cross-runtime utilities (logger)
- `rxjs` -- Reactive event bus implementation
- `jsonrpc-lite` -- JSON-RPC 2.0 protocol parsing

## License

See the root repository for license information.
