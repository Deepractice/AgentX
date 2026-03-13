# @agentxjs/core

Foundation library for the AgentX framework — a TypeScript toolkit for building AI agent applications with tool use, streaming, and multi-turn conversation.

`@agentxjs/core` defines the types, interfaces, and agent engine that every other AgentX package depends on. You typically don't install it directly — it's pulled in as a dependency of `agentxjs`, `@agentxjs/server`, or driver packages.

## Core Concepts

AgentX is built around five concepts that work together:

```
Prototype  ──creates──►  Image  ──has──►  Session
  (template)               │
                    created as──►  Agent  ──uses──►  Driver
                                    │
                             runs on──►  Platform

Container  ──scopes──►  Prototypes, Images, Sessions
```

### Container

A **Container** groups related agent configurations. Think of it as a namespace — one per app, workspace, or tenant. All Images inside a Container share the same isolation boundary.

```typescript
// Create a container for your app
const container = await runtime.getOrCreateContainer("my-app");
```

### Image

An **Image** is a persistent agent record created from a Prototype or an Agent blueprint. When created from a Prototype, the Image's `prototypeId` field tracks its origin. It stores the agent's configuration (via **Embodiment**), session, and message history. One Image can spawn many runtime instances over time.

```typescript
// Create an image from a blueprint
const image = await createImage(
  {
    containerId: "my-app",
    name: "CodeReviewer",
    embody: {
      model: "claude-sonnet-4-6",
      systemPrompt: "You are a code review assistant.",
      mcpServers: { /* optional tool servers */ },
    },
  },
  ctx
);
```

### Prototype

A **Prototype** is a reusable, registered agent definition — a template that creates many Images. Like a Dockerfile that builds many Docker images. Prototypes are scoped to a Container and stored via `PrototypeRepository`.

```typescript
interface PrototypeRecord {
  prototypeId: string;    // Unique ID (pattern: proto_${timestamp}_${random})
  containerId: string;    // Scope boundary
  name: string;           // Display name
  description?: string;
  contextId?: string;     // Cognitive context (soul)
  embody?: Embodiment;    // Runtime config (body)
  customData?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
```

### Embodiment

An **Embodiment** is runtime configuration for an agent's "body" — model, system prompt, and MCP servers. It lives inside the Image record and is resolved by the runtime when creating an agent instance.

```typescript
interface Embodiment {
  model?: string;           // LLM model (overrides container default)
  systemPrompt?: string;    // System prompt
  mcpServers?: Record<string, McpServerConfig>;  // MCP tool servers
}
```

Model priority: `embody.model > container default provider > environment variable`.

### Session

A **Session** holds the conversation message history for an Image. Each Image has one active Session. Messages accumulate across multiple Agent runs, providing continuity.

```typescript
// Session is created automatically with the Image
// Messages are persisted and survive agent restarts
const messages = session.getMessages(); // full conversation history
```

### Driver

A **Driver** handles communication with an LLM provider. It takes a user message, sends it to the API, and returns a stream of events (text chunks, tool calls, etc.). To support a new LLM provider, you implement the Driver interface:

```typescript
interface Driver {
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  interrupt(): void;
  readonly state: DriverState; // "idle" | "active" | "disposed"
  readonly supportedProtocols: readonly LLMProtocol[]; // "anthropic" | "openai"
}

// Factory function that the runtime calls to create a Driver per agent
type CreateDriver = (config: DriverConfig) => Driver;
```

Each driver declares which LLM API protocols it supports via `supportedProtocols`. When `createAgent` is called, the runtime validates that the container's default LLM provider protocol matches the driver's supported protocols.

| Driver       | Supported Protocols       |
| ------------ | ------------------------- |
| MonoDriver   | `["anthropic", "openai"]` |
| ClaudeDriver | `["anthropic"]`           |

**To add a new LLM provider**: implement `Driver` and export a `CreateDriver` factory. Your factory receives `DriverConfig` with `apiKey`, `model`, `systemPrompt`, `session` (for message history), and `mcpServers`. Declare `supportedProtocols` to indicate which API formats your driver handles. See `@agentxjs/mono-driver` for a reference implementation.

### Platform

A **Platform** provides the infrastructure: repositories for data storage, an event bus for streaming, and optional bash execution. To change where data is stored (e.g., from SQLite to PostgreSQL), you implement the repository interfaces and wire them into a Platform:

```typescript
interface AgentXPlatform {
  containerRepository: ContainerRepository; // CRUD for containers
  imageRepository: ImageRepository; // CRUD for images + metadata
  sessionRepository: SessionRepository; // CRUD for sessions + messages
  eventBus: EventBus; // pub/sub for stream events
  llmProviderRepository?: LLMProviderRepository; // optional LLM provider management
  prototypeRepository?: PrototypeRepository; // optional prototype registry
  bashProvider?: BashProvider; // optional shell execution
}
```

**To change storage backend**: implement `ContainerRepository`, `ImageRepository`, and `SessionRepository`. Each repository is a simple CRUD interface. See `@agentxjs/node-platform` for a SQLite reference implementation.

## AgentEngine Pipeline

The Runtime doesn't just relay raw driver events — it processes them through a **MealyMachine** that derives higher-level events:

```
Driver Stream Events (raw)
  │
  ├── message_start, text_delta, tool_use_start, message_stop, error ...
  │
  ▼
MealyMachine  ── pure (state, event) → [newState, outputs]
  │
  ├── MessageAssembler  ── stream → message events
  │     ├── assistant_message, tool_call_message, tool_result_message
  │     └── error_message  ← driver error → ErrorConversation in Presentation
  │
  ├── StateEventProcessor  ── stream → state events
  │     ├── conversation_start, conversation_responding, conversation_end
  │     └── error_occurred  ← driver error → state transition
  │
  └── TurnTracker  ── stream → turn events
        └── turn_request (from message_start), turn_response (from message_stop)
```

**Error flow**: When a driver emits an `error` event (e.g., LLM API returns 403), the engine produces both an `error_message` (becomes `ErrorConversation` in the Presentation layer for UI display) and an `error_occurred` (triggers state transition back to idle).

**Key design**: only raw `StreamEvent`s enter the MealyMachine. All message, state, and turn events are **derived** — never injected from outside. Processors can chain: outputs from one processor feed into others (e.g., TurnTracker reads `message_start` / `message_stop` from the stream layer).

The Runtime's **Presenter** handles the outputs:

- **Stream events**: emitted directly to EventBus (for real-time UI streaming)
- **Message events**: emitted to EventBus + persisted to SessionRepository
- **State/Turn events**: emitted to EventBus

```typescript
// Subscribe to different event layers
runtime.subscribe(agentId, (event) => {
  switch (event.type) {
    // Stream layer — real-time chunks
    case "text_delta":
      process.stdout.write(event.data.text);
      break;

    // Message layer — complete, persisted messages
    case "assistant_message":
      console.log("Full reply:", event.data.content);
      break;

    // State layer — conversation lifecycle
    case "conversation_start":
    case "conversation_end":
      break;

    // Turn layer — request-response tracking
    case "turn_response":
      console.log(`Turn took ${event.data.duration}ms`);
      break;
  }
});
```

## Quick Start

Most developers use `agentxjs` (the SDK) instead of `@agentxjs/core` directly. Core is for building custom drivers, platforms, or extending the framework.

```typescript
import { createAgentXRuntime } from "@agentxjs/core/runtime";

// Platform and driver come from other packages
const runtime = createAgentXRuntime(platform, createDriver);

const agent = await runtime.createAgent({ imageId: "img_xxx" });

const sub = runtime.subscribe(agent.agentId, (event) => {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
});

await runtime.receive(agent.agentId, "Hello!");

sub.unsubscribe();
await runtime.destroyAgent(agent.agentId);
await runtime.shutdown();
```

## API Reference

### Sub-module Imports

```typescript
import { ... } from "@agentxjs/core";            // common + agent
import { ... } from "@agentxjs/core/agent";       // agent engine
import { ... } from "@agentxjs/core/container";    // container management
import { ... } from "@agentxjs/core/image";        // image management
import { ... } from "@agentxjs/core/session";      // session/message management
import { ... } from "@agentxjs/core/driver";       // LLM driver interface
import { ... } from "@agentxjs/core/platform";     // platform interface
import { ... } from "@agentxjs/core/runtime";      // runtime orchestration
import { ... } from "@agentxjs/core/event";        // event bus system
import { ... } from "@agentxjs/core/bash";         // command execution
import { ... } from "@agentxjs/core/network";      // client-server protocol
import { ... } from "@agentxjs/core/persistence";  // repository interfaces
import { ... } from "@agentxjs/core/llm";           // LLM provider types
import { ... } from "@agentxjs/core/mq";           // message queue interface
```

### Runtime (`@agentxjs/core/runtime`)

Orchestrates agent lifecycle. Takes platform and driver as separate parameters.

```typescript
function createAgentXRuntime(platform: AgentXPlatform, createDriver: CreateDriver): AgentXRuntime;

interface AgentXRuntime {
  createAgent(options: CreateAgentOptions): Promise<RuntimeAgent>;
  destroyAgent(agentId: string): Promise<void>;
  receive(agentId: string, content: string | unknown[]): Promise<void>;
  subscribe(agentId: string, handler: AgentEventHandler): Subscription;
  shutdown(): Promise<void>;
}
```

### Driver (`@agentxjs/core/driver`)

```typescript
interface DriverConfig<TOptions = Record<string, unknown>> {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number; // default: 600000 (10 min)
  agentId: string;
  systemPrompt?: string;
  cwd?: string;
  mcpServers?: Record<string, McpServerConfig>; // MCP tool servers
  tools?: ToolDefinition[]; // inline tools
  session?: Session; // conversation history
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
  options?: TOptions; // driver-specific options
}
```

**DriverStreamEvent** — the events your driver yields:

| Event              | Data                               | When                     |
| ------------------ | ---------------------------------- | ------------------------ |
| `message_start`    | `{ messageId, model }`             | LLM starts responding    |
| `text_delta`       | `{ text }`                         | Incremental text chunk   |
| `tool_use_start`   | `{ toolCallId, toolName }`         | LLM wants to call a tool |
| `input_json_delta` | `{ partialJson }`                  | Incremental tool input   |
| `tool_use_stop`    | `{ toolCallId, toolName, input }`  | Tool call complete       |
| `tool_result`      | `{ toolCallId, result, isError? }` | Tool execution result    |
| `message_stop`     | `{ stopReason }`                   | LLM finished responding  |
| `error`            | `{ message, errorCode? }`          | Error occurred           |

**McpServerConfig** — two transports for connecting external tool servers:

```typescript
// Local subprocess (stdio)
{ command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }

// Remote server (HTTP Streamable)
{ type: "http", url: "https://mcp.example.com/sse" }
```

### Container (`@agentxjs/core/container`)

```typescript
function createContainer(config: ContainerCreateConfig, ctx: ContainerContext): Promise<Container>;
function loadContainer(containerId: string, ctx: ContainerContext): Promise<Container | null>;
function getOrCreateContainer(containerId: string, ctx: ContainerContext): Promise<Container>;
```

`ContainerContext` provides the repository: `{ containerRepository: ContainerRepository }`.

### Image (`@agentxjs/core/image`)

```typescript
function createImage(config: ImageCreateConfig, ctx: ImageContext): Promise<Image>;
function loadImage(imageId: string, ctx: ImageContext): Promise<Image | null>;
```

`ImageCreateConfig`: `{ containerId, name?, description?, contextId?, embody?, customData? }`.
`ImageContext` provides repositories: `{ imageRepository, sessionRepository }`.

### Session (`@agentxjs/core/session`)

```typescript
function createSession(config: SessionConfig): Session;

interface Session {
  initialize(): Promise<void>;
  addMessage(msg: Message): Promise<void>;
  getMessages(): Message[];
  clear(): Promise<void>;
}
```

### Event (`@agentxjs/core/event`)

Typed pub/sub event bus.

```typescript
interface EventBus {
  emit(event: BusEvent): void;
  on<T extends string>(type: T, handler: BusEventHandler): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;
  asProducer(): EventProducer; // write-only view
  asConsumer(): EventConsumer; // read-only view
}
```

### Persistence (`@agentxjs/core/persistence`)

Repository interfaces for data storage. Each is a simple CRUD interface:

```typescript
interface ContainerRepository {
  create(record: ContainerRecord): Promise<void>;
  findById(containerId: string): Promise<ContainerRecord | null>;
  findAll(): Promise<ContainerRecord[]>;
  delete(containerId: string): Promise<void>;
}

// ImageRepository, SessionRepository, PrototypeRepository follow the same CRUD pattern

interface PrototypeRepository {
  savePrototype(record: PrototypeRecord): Promise<void>;
  findPrototypeById(prototypeId: string): Promise<PrototypeRecord | null>;
  findAllPrototypes(): Promise<PrototypeRecord[]>;
  findPrototypesByContainerId(containerId: string): Promise<PrototypeRecord[]>;
  deletePrototype(prototypeId: string): Promise<void>;
  prototypeExists(prototypeId: string): Promise<boolean>;
}
```

### Bash (`@agentxjs/core/bash`)

```typescript
interface BashProvider {
  execute(command: string, options?: BashOptions): Promise<BashResult>;
}

interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function createBashTool(provider: BashProvider): ToolDefinition;
```

## Configuration

This package has no runtime configuration. It provides interfaces configured through implementation packages:

| Concern     | Configured via                                                                       |
| ----------- | ------------------------------------------------------------------------------------ |
| Persistence | `@agentxjs/node-platform` (`dataPath`)                                               |
| Driver      | `@agentxjs/mono-driver` or `@agentxjs/claude-driver` (`apiKey`, `provider`, `model`) |
| Event Bus   | Created by platform (`new EventBusImpl()`)                                           |
| Bash        | Created by platform (`NodeBashProvider`)                                             |

**Dependencies**: `commonxjs`, `rxjs`, `jsonrpc-lite`
