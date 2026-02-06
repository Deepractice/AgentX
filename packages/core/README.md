# @agentxjs/core

Foundation library for the AgentX framework. Defines all types, interfaces, and the agent engine that every other AgentX package depends on.

## Overview

`@agentxjs/core` provides the five building blocks of AgentX:

| Concept | What it is | Analogy |
|---------|-----------|---------|
| **Container** | Resource isolation boundary | Kubernetes namespace |
| **Image** | Persistent agent configuration (system prompt, MCP servers) | Docker image |
| **Session** | Conversation message history for an Image | Chat thread |
| **Driver** | LLM communication interface (send message, get stream) | Database driver |
| **Platform** | Dependency injection container (repositories, event bus) | Runtime environment |

## Quick Start

```typescript
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import type { AgentXPlatform } from "@agentxjs/core/platform";
import type { CreateDriver } from "@agentxjs/core/driver";

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
import { ... } from "@agentxjs/core/image";         // image management
import { ... } from "@agentxjs/core/session";       // session/message management
import { ... } from "@agentxjs/core/driver";        // LLM driver interface
import { ... } from "@agentxjs/core/platform";      // platform interface
import { ... } from "@agentxjs/core/runtime";       // runtime orchestration
import { ... } from "@agentxjs/core/event";         // event bus system
import { ... } from "@agentxjs/core/bash";          // command execution
import { ... } from "@agentxjs/core/network";       // client-server protocol (JSON-RPC 2.0)
import { ... } from "@agentxjs/core/persistence";   // repository interfaces
import { ... } from "@agentxjs/core/mq";            // message queue interface
```

### Platform (`@agentxjs/core/platform`)

The dependency injection container. Platform packages (e.g., `@agentxjs/node-platform`) provide implementations.

```typescript
interface AgentXPlatform {
  containerRepository: ContainerRepository;
  imageRepository: ImageRepository;
  sessionRepository: SessionRepository;
  eventBus: EventBus;
  bashProvider?: BashProvider;   // optional -- not all platforms support shell
}
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

// RuntimeAgent, AgentLifecycle, CreateAgentOptions, AgentEventHandler, Subscription
```

### Driver (`@agentxjs/core/driver`)

LLM communication interface. Each driver implementation package exports a `CreateDriver` factory.

```typescript
interface Driver {
  readonly name: string;
  readonly sessionId: string | null;
  readonly state: DriverState;   // "idle" | "active" | "disposed"
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;
  interrupt(): void;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

type CreateDriver<TOptions = Record<string, unknown>> = (config: DriverConfig<TOptions>) => Driver;

interface DriverConfig<TOptions> {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;                                  // default: 600000 (10 min)
  agentId: string;
  systemPrompt?: string;
  cwd?: string;
  mcpServers?: Record<string, McpServerConfig>;
  tools?: ToolDefinition[];
  session?: Session;
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
  options?: TOptions;
}
```

**DriverStreamEvent** -- union of all stream events:

| Event | Data |
|-------|------|
| `message_start` | `{ messageId, model }` |
| `text_delta` | `{ text }` |
| `tool_use_start` | `{ toolCallId, toolName }` |
| `input_json_delta` | `{ partialJson }` |
| `tool_use_stop` | `{ toolCallId, toolName, input }` |
| `tool_result` | `{ toolCallId, result, isError? }` |
| `message_stop` | `{ stopReason }` |
| `error` | `{ message, errorCode? }` |
| `interrupted` | `{ reason }` |

**StopReason**: `"end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | "content_filter" | "error" | "other"`

**McpServerConfig** supports two transports:

```typescript
// Stdio -- local subprocess
{ command: string; args?: string[]; env?: Record<string, string> }

// HTTP Streamable -- remote server
{ type: "http"; url: string; headers?: Record<string, string> }
```

**ToolDefinition**:

```typescript
interface ToolDefinition {
  name: string;
  description?: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}
```

### Container (`@agentxjs/core/container`)

```typescript
function createContainer(config: ContainerCreateConfig, ctx: ContainerContext): Promise<Container>;
function loadContainer(containerId: string, ctx: ContainerContext): Promise<Container | null>;
function getOrCreateContainer(containerId: string, ctx: ContainerContext): Promise<Container>;

// Types: ContainerRecord, ContainerConfig, ContainerRepository, Container, ContainerContext
```

### Image (`@agentxjs/core/image`)

```typescript
function createImage(config: ImageCreateConfig, ctx: ImageContext): Promise<Image>;
function loadImage(imageId: string, ctx: ImageContext): Promise<Image | null>;

// Types: ImageMetadata, ImageRecord, ImageRepository, Image, ImageContext
```

### Session (`@agentxjs/core/session`)

```typescript
function createSession(config: SessionConfig): Session;

// Session methods: initialize(), addMessage(msg), getMessages(), clear()
// Types: SessionRecord, SessionRepository, Session, SessionConfig
```

### Event (`@agentxjs/core/event`)

Typed pub/sub event bus backed by RxJS.

```typescript
class EventBusImpl implements EventBus

interface EventBus {
  emit(event: BusEvent): void;
  on<T extends string>(type: T, handler: BusEventHandler): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;
  asProducer(): EventProducer;   // write-only view
  asConsumer(): EventConsumer;   // read-only view
}
```

### Agent (`@agentxjs/core/agent`)

Event processing engine using a Mealy Machine pattern: `(state, input) -> (state, outputs)`.

```typescript
function createAgent(options: CreateAgentOptions): AgentEngine;

// Classes: AgentStateMachine, MealyMachine
// Processors: agentProcessor, messageAssemblerProcessor, stateEventProcessor, turnTrackerProcessor
// Combinators: combineProcessors, chainProcessors, filterProcessor, mapOutput, withLogging
```

### Bash (`@agentxjs/core/bash`)

```typescript
interface BashProvider {
  execute(command: string, options?: BashOptions): Promise<BashResult>;
}

interface BashResult { stdout: string; stderr: string; exitCode: number }

function createBashTool(provider: BashProvider): ToolDefinition;
```

### Persistence (`@agentxjs/core/persistence`)

Repository interfaces for data storage. Implementations are platform-specific.

```typescript
// ContainerRepository, ImageRepository, SessionRepository
// ContainerRecord, ImageRecord, SessionRecord, ImageMetadata
```

### Network (`@agentxjs/core/network`)

Transport-agnostic client-server communication with JSON-RPC 2.0 and reliable delivery.

```typescript
// Interfaces: ChannelServer, ChannelClient, ChannelConnection
// RpcClient: JSON-RPC 2.0 client over WebSocket
// Helpers: createRequest, createSuccessResponse, createErrorResponse, parseMessage
// Protocol: wrapMessage, createAck, unwrapMessage
```

### Message Queue (`@agentxjs/core/mq`)

```typescript
// MessageQueue, MessageQueueProvider, QueueEntry, QueueConfig
// OffsetGenerator: monotonically increasing, lexicographically sortable offsets
```

## Configuration

This package has no runtime configuration of its own. It provides interfaces that are configured through the packages that implement them:

| Concern | Configured via |
|---------|---------------|
| Persistence | `@agentxjs/node-platform` (`dataPath`) |
| Driver | `@agentxjs/mono-driver` or `@agentxjs/claude-driver` (`apiKey`, `provider`, `model`) |
| Event Bus | Created by platform (`new EventBusImpl()`) |
| Bash | Created by platform (`NodeBashProvider`) |

**Dependencies**: `commonxjs`, `rxjs`, `jsonrpc-lite`
