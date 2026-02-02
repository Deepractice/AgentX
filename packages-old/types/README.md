# @agentxjs/types

Type definitions for the AgentX AI Agent platform. Zero-dependency TypeScript types shared across all AgentX packages.

## Installation

```bash
bun add @agentxjs/types
```

## Overview

`@agentxjs/types` provides the complete type system for AgentX, organized into focused submodules:

| Submodule  | Description                                            |
| ---------- | ------------------------------------------------------ |
| `/agent`   | AgentEngine domain - event processing, messages, state |
| `/runtime` | Runtime domain - Container, Agent, Session, Sandbox    |
| `/event`   | SystemEvent and all runtime events                     |
| `/agentx`  | High-level API types and configuration                 |
| `/network` | Channel abstraction for client-server communication    |
| `/queue`   | Event queue with persistence support                   |
| `/common`  | Shared infrastructure (Logger)                         |

## Quick Start

### Submodule Imports (Recommended)

```typescript
// AgentEngine domain
import type { AgentEngine, AgentDriver, AgentState } from "@agentxjs/types/agent";
import type { Message, UserMessage, AssistantMessage } from "@agentxjs/types/agent";
import type { StreamEvent, TextDeltaEvent } from "@agentxjs/types/agent";

// Runtime domain
import type { Runtime, Agent, Container, AgentImage } from "@agentxjs/types/runtime";

// Event system
import type { SystemEvent, DriveableEvent } from "@agentxjs/types/event";

// High-level API
import type { AgentX, AgentDefinition, AgentXConfig } from "@agentxjs/types/agentx";

// Network
import type { ChannelServer, ChannelClient, ChannelConnection } from "@agentxjs/types/network";

// Queue
import type { EventQueue, QueueEntry } from "@agentxjs/types/queue";
```

## Key Exports

### Agent Domain (`/agent`)

Core event processing types:

```typescript
// AgentEngine - event processing unit
interface AgentEngine {
  readonly agentId: string;
  readonly state: AgentState;
  receive(message: string | UserMessage): Promise<void>;
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  react(handlers: ReactHandlerMap): Unsubscribe;
  destroy(): Promise<void>;
}

// AgentState - state machine states
type AgentState =
  | "idle"
  | "thinking"
  | "responding"
  | "planning_tool"
  | "awaiting_tool_result"
  | "error";

// Message types
type Message = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage | ErrorMessage;
```

### Event System (`/event`)

Unified event system with rich context:

```typescript
interface SystemEvent<T, D, S, C, I> {
  readonly type: T;
  readonly timestamp: number;
  readonly data: D;
  readonly source: S; // "environment" | "agent" | "session" | "container" | "sandbox" | "command"
  readonly category: C; // "stream" | "state" | "message" | "turn" | "lifecycle" | etc.
  readonly intent: I; // "request" | "result" | "notification"
  readonly context?: EventContext;
}
```

### Runtime Domain (`/runtime`)

Complete runtime entity types:

```typescript
// Agent - runtime entity with lifecycle
interface Agent {
  readonly agentId: string;
  readonly lifecycle: AgentLifecycle;
  receive(content: string | UserContentPart[]): Promise<void>;
  interrupt(): void;
  stop(): Promise<void>;
  resume(): Promise<void>;
  destroy(): Promise<void>;
}

// Container - isolation boundary
interface Container {
  readonly containerId: string;
  runImage(image: ImageRecord): Promise<{ agent: Agent; reused: boolean }>;
  getAgent(agentId: string): Agent | undefined;
  dispose(): Promise<void>;
}
```

### AgentX API (`/agentx`)

High-level API types:

```typescript
// AgentX - unified API interface
interface AgentX {
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>
  ): Promise<ResponseEventFor<T>>;
  on<T extends string>(type: T, handler: (event: SystemEvent & { type: T }) => void): Unsubscribe;
  listen(port: number): Promise<void>;
  dispose(): Promise<void>;
}

// Configuration
interface AgentDefinition {
  name: string;
  description?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
}
```

### Network (`/network`)

Channel abstraction for communication:

```typescript
interface ChannelConnection {
  readonly id: string;
  send(message: string): void;
  sendReliable(message: string, options?: SendReliableOptions): void;
  onMessage(handler: (message: string) => void): Unsubscribe;
  close(): void;
}

interface ChannelServer {
  listen(port: number): Promise<void>;
  onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe;
  broadcast(message: string): void;
}
```

### Queue (`/queue`)

Event queue with persistence:

```typescript
interface EventQueue {
  publish(topic: string, event: unknown): string;
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;
  ack(consumerId: string, topic: string, cursor: string): Promise<void>;
  recover(topic: string, afterCursor?: string): Promise<QueueEntry[]>;
}
```

## Usage Examples

### Handling Events

```typescript
import type { AgentEngine, TextDeltaEvent, AssistantMessageEvent } from "@agentxjs/types/agent";

function setupEngine(engine: AgentEngine) {
  // Subscribe to specific event
  engine.on("text_delta", (event: TextDeltaEvent) => {
    process.stdout.write(event.data.text);
  });

  // React-style handlers
  engine.react({
    onTextDelta: (e) => console.log(e.data.text),
    onAssistantMessage: (e) => saveMessage(e.data),
  });
}
```

### Working with Messages

```typescript
import type { Message } from "@agentxjs/types/agent";

function handleMessage(msg: Message) {
  switch (msg.subtype) {
    case "user":
      console.log("User:", msg.content);
      break;
    case "assistant":
      console.log("Assistant:", msg.content);
      break;
    case "tool-call":
      console.log("Tool:", msg.toolCall.name);
      break;
    case "tool-result":
      console.log("Result:", msg.toolResult.output);
      break;
  }
}
```

### Type Guards

```typescript
import { isFromSource, isRequest, isResult } from "@agentxjs/types/event";
import { isStateEvent, isMessageEvent } from "@agentxjs/types/agent";

function processEvent(event: SystemEvent) {
  if (isFromSource(event, "agent")) {
    if (isStateEvent(event)) {
      console.log("State:", event.type);
    }
    if (isMessageEvent(event)) {
      console.log("Message:", event.type);
    }
  }
}
```

## Architecture

### Two-Domain Design

```
Runtime Domain                      AgentEngine Domain
---------------------------------------------------------------
Agent (complete entity)             AgentEngine (processing unit)
  - lifecycle: stop/resume            - receive/on/react
  - LLM + Sandbox + Session           - Driver + MealyMachine + Presenter

SystemEvent (full context)          EngineEvent (lightweight)
  - source, category, intent          - type, timestamp, data

DriveableEvent                      StreamEvent
  - from Environment                  - simplified for Engine
        |                                    ^
        +-------- Driver converts ----------+
```

### Package Dependencies

```
@agentxjs/types (this package)
     ^
@agentxjs/common
     ^
@agentxjs/agent
     ^
@agentxjs/runtime
     ^
agentxjs
```

## Documentation

For complete API documentation and design decisions, see:
[Full Documentation](../../../docs/packages/types.md)

## Related Packages

| Package             | Description                         |
| ------------------- | ----------------------------------- |
| `@agentxjs/common`  | Logger, SQLite, Path utilities      |
| `@agentxjs/agent`   | AgentEngine implementation          |
| `@agentxjs/runtime` | Runtime, Container, Session         |
| `@agentxjs/network` | WebSocket channel implementation    |
| `@agentxjs/queue`   | Event queue with SQLite persistence |
| `agentxjs`          | Unified AgentX API                  |

## License

MIT
