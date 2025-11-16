# @deepractice-ai/agentx-core

**AgentX Core** - Platform-agnostic core engine for building AI agents with event-driven architecture.

## Overview

AgentX Core is the heart of the AgentX ecosystem, providing a **Reactor-based event-driven architecture** for building AI agents. It's platform-agnostic and requires a Driver implementation to connect to specific LLM providers.

### Key Features

- 🔌 **Driver Injection** - Bring your own LLM provider (Claude, OpenAI, etc.)
- ⚡ **Reactor Pattern** - Event-driven architecture with automatic lifecycle management
- 📊 **4-Layer Events** - Stream, State, Message, and Exchange events for different perspectives
- 🎯 **Type-Safe** - Full TypeScript support with strict event types
- 🪶 **Lightweight** - Zero dependencies on specific LLM SDKs

## Architecture

```
AgentEngine
  ├── EventBus (RxJS-based communication backbone)
  └── ReactorRegistry
        ├── DriverReactor (Driver → Stream Events)
        ├── StateMachineReactor (Stream → State Events)
        ├── MessageAssemblerReactor (Stream → Message Events)
        ├── ExchangeTrackerReactor (Message → Exchange Events)
        └── User Reactors (custom event handlers)
```

### 4-Layer Event System

AgentX Core generates events at four semantic layers:

1. **Stream Layer** - Real-time incremental data (text deltas, tool calls)
2. **State Layer** - State machine transitions (thinking, responding, executing)
3. **Message Layer** - Complete messages (user/assistant messages)
4. **Exchange Layer** - Request-response pairs with analytics (cost, duration, tokens)

All layers observe the same interaction from different perspectives.

## Installation

```bash
pnpm add @deepractice-ai/agentx-core
```

**Platform-Specific SDKs:**

For most use cases, use a platform-specific SDK instead:
- **Node.js**: `@deepractice-ai/agentx-node` (includes ClaudeDriver)
- **Browser**: `@deepractice-ai/agentx-browser` (includes WebSocketDriver)

## Quick Start

### Basic Usage

```typescript
import { AgentService } from "@deepractice-ai/agentx-core";
import { ClaudeDriver } from "@deepractice-ai/agentx-node";

// Create driver (platform-specific)
const driver = new ClaudeDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  sessionId: "my-session",
});

// Create agent
const agent = new AgentService(driver);

// Initialize
await agent.initialize();

// Subscribe to events
agent.react({
  onAssistantMessage(event) {
    console.log("Assistant:", event.data.content);
  },
});

// Send message
await agent.send("Hello, how are you?");

// Cleanup
await agent.destroy();
```

### Event Handling

AgentX uses method naming convention for event subscription:

```typescript
agent.react({
  // Stream Layer - Real-time deltas
  onTextDelta(event) {
    process.stdout.write(event.data.text); // Typewriter effect
  },

  // State Layer - State transitions
  onConversationResponding(event) {
    console.log("Agent is responding...");
  },

  // Message Layer - Complete messages
  onAssistantMessage(event) {
    console.log("Complete response:", event.data.content);
  },

  // Exchange Layer - Analytics
  onExchangeResponse(event) {
    console.log(`Cost: $${event.data.costUsd}`);
    console.log(`Duration: ${event.data.durationMs}ms`);
  },
});
```

## Core Concepts

### AgentDriver (SPI)

The `AgentDriver` interface is the **Service Provider Interface** for connecting to LLM providers:

```typescript
interface AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string | null;

  // Returns async iterable of Stream events
  sendMessage(message: UserMessage): AsyncIterable<StreamEventType>;

  abort(): void;
  destroy(): Promise<void>;
}
```

**Driver Implementations:**
- `ClaudeDriver` - Uses `@anthropic-ai/sdk` (Node.js)
- `WebSocketDriver` - Connects to AgentX server (Browser)
- `MockDriver` - For testing

### Reactor Pattern

Reactors are event processors with managed lifecycles:

```typescript
interface Reactor {
  readonly id: string;
  readonly name: string;

  initialize(context: ReactorContext): void | Promise<void>;
  destroy(): void | Promise<void>;
}
```

**Built-in Reactors:**
- `DriverReactor` - Transforms Driver output to Stream events
- `StateMachineReactor` - Generates State events from Stream events
- `MessageAssemblerReactor` - Assembles Message events from Stream deltas
- `ExchangeTrackerReactor` - Tracks request-response pairs

**Custom Reactors:**

```typescript
class MyAnalyticsReactor implements Reactor {
  readonly id = "analytics";
  readonly name = "AnalyticsReactor";

  async initialize(context: ReactorContext): Promise<void> {
    // Subscribe to events
    context.consumer.consumeByType("exchange_response", (event) => {
      this.trackCost(event.data.costUsd);
    });
  }

  async destroy(): Promise<void> {
    // Cleanup
  }

  private trackCost(cost: number) {
    // Your analytics logic
  }
}

// Register custom reactor
const agent = new AgentService(driver, logger, {
  reactors: [new MyAnalyticsReactor()],
});
```

### AgentEngine

`AgentEngine` orchestrates all Reactors:

```typescript
const engine = new AgentEngine(driver, logger, {
  reactors: [new MyReactor()],
});

await engine.initialize(); // Initializes all Reactors
await engine.destroy();    // Destroys all Reactors (reverse order)
```

### AgentService

`AgentService` is the user-friendly API facade:

```typescript
const agent = new AgentService(driver, logger, config);

// Public API
await agent.initialize();
await agent.send("Hello");
agent.react({ onAssistantMessage(e) {} });
agent.clear();
await agent.destroy();

// Access message history
const messages = agent.messages;
```

## Event Types

### Stream Events

Real-time incremental events during streaming:

- `MessageStartEvent` - Message begins
- `TextDeltaEvent` - Text chunk arrives
- `TextContentBlockStartEvent` / `TextContentBlockStopEvent`
- `ToolUseContentBlockStartEvent` / `ToolUseContentBlockStopEvent`
- `InputJsonDeltaEvent` - Tool input chunk
- `MessageStopEvent` - Message complete

### State Events

State machine transitions:

- `AgentInitializingStateEvent` / `AgentReadyStateEvent`
- `ConversationStartStateEvent` / `ConversationEndStateEvent`
- `ConversationThinkingStateEvent` / `ConversationRespondingStateEvent`
- `ToolPlannedStateEvent` / `ToolExecutingStateEvent` / `ToolCompletedStateEvent`
- `StreamStartStateEvent` / `StreamCompleteStateEvent`

### Message Events

Complete messages:

- `UserMessageEvent` - User sent a message
- `AssistantMessageEvent` - Assistant completed response
- `ToolUseMessageEvent` - Tool call + result (unified view)
- `ErrorMessageEvent` - Error occurred

### Exchange Events

Request-response analytics:

- `ExchangeRequestEvent` - User initiated request
- `ExchangeResponseEvent` - Assistant completed response (with cost, duration, tokens)

## Advanced Usage

### Custom Logger

```typescript
import { AgentLogger, LogLevel, LogContext } from "@deepractice-ai/agentx-core";

class MyLogger implements AgentLogger {
  log(level: LogLevel, message: string, ...args: any[]): void {
    // Your logging logic
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  // ... implement other methods
}

const agent = new AgentService(driver, new MyLogger());
```

### Direct EventBus Access

```typescript
const agent = new AgentService(driver);
await agent.initialize();

// Access EventBus directly
const consumer = agent.engine.eventBus.createConsumer();

consumer.consumeByType("text_delta", (event) => {
  console.log(event.data.text);
});
```

### Message History

```typescript
const agent = new AgentService(driver);

await agent.send("Hello");
await agent.send("How are you?");

// Access message history
console.log(agent.messages);
// [
//   { role: "user", content: "Hello", ... },
//   { role: "assistant", content: "Hi there!", ... },
//   { role: "user", content: "How are you?", ... },
//   { role: "assistant", content: "I'm doing well!", ... }
// ]

// Clear history
agent.clear();
```

## API Reference

### AgentService

```typescript
class AgentService {
  readonly id: string;
  readonly sessionId: string;
  readonly messages: ReadonlyArray<Message>;

  constructor(driver: AgentDriver, logger?: AgentLogger, config?: EngineConfig);

  initialize(): Promise<void>;
  send(message: string): Promise<void>;
  react(handlers: Record<string, Function>): () => void;
  clear(): void;
  destroy(): Promise<void>;
}
```

### AgentEngine

```typescript
class AgentEngine {
  readonly agentId: string;
  readonly sessionId: string;
  readonly eventBus: AgentEventBus;

  constructor(driver: AgentDriver, logger?: AgentLogger, config?: EngineConfig);

  initialize(): Promise<void>;
  abort(): void;
  destroy(): Promise<void>;
}
```

### EngineConfig

```typescript
interface EngineConfig {
  reactors?: Reactor[];
}
```

## Design Principles

1. **Platform Agnostic** - Core has no dependencies on specific LLM SDKs
2. **Driver Injection** - Platform-specific logic lives in Drivers
3. **Event-Driven** - Everything flows through EventBus
4. **Reactor Pattern** - Managed lifecycle for all event processors
5. **Layered Events** - Multiple perspectives on the same interaction
6. **Type Safety** - Strict TypeScript types throughout

## Related Packages

- **[@deepractice-ai/agentx-types](../agentx-types)** - Message and content types
- **[@deepractice-ai/agentx-event](../agentx-event)** - Event type definitions
- **[@deepractice-ai/agentx-node](../agentx-node)** - Node.js provider with ClaudeDriver
- **[@deepractice-ai/agentx-browser](../agentx-browser)** - Browser WebSocket client

## License

MIT
