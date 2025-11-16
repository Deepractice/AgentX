# @deepractice-ai/agentx-core

**AgentX Core** - Platform-agnostic core implementation for AI agent runtime with layered event architecture.

## 📋 Overview

This package provides the core implementation of the AgentX agent system. It is **platform-agnostic** and requires a `AgentDriver` to be injected for specific platforms (e.g., Node.js with Claude SDK, Browser with WebSocket).

**Key Features**:
- 🎯 **4-Layer Event Generation Pipeline** - Stream → State → Message → Exchange events
- 🔌 **Driver-Based Architecture** - Platform-agnostic core with injectable drivers
- 📡 **Event-Driven Communication** - RxJS-based EventBus for reactive programming
- 🎭 **Reactor Pattern Support** - Type-safe event handling with automatic binding
- 📝 **Message History Management** - Built-in conversation tracking
- 🔄 **Lifecycle Management** - Clean initialization and destruction

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentService                             │
│                    (User-Facing API)                            │
│  Methods: send(), on(), clear(), destroy()                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AgentRuntime                              │
│                  (Core Orchestration)                           │
│  - Creates EventBus                                             │
│  - Manages 4-layer pipeline                                     │
│  - Coordinates Driver and Reactors                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    EventBus        Driver          Reactors
        │               │               │
        │               └──────┬────────┘
        │                      │
        └──────────────────────┘
                 Events Flow

### 4-Layer Event Generation Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  1. Stream Layer                                             │
│     Driver → Stream Events (MessageStart, TextDelta, ...)    │
│     Purpose: Incremental data transmission                   │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  2. State Layer                                              │
│     StateMachine → State Events (AgentReady, Thinking, ...)  │
│     Purpose: Lifecycle and state transitions                 │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Message Layer                                            │
│     MessageAssembler → Message Events (UserMessage, ...)     │
│     Purpose: Complete messages (user perspective)            │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Exchange Layer                                           │
│     ExchangeTracker → Exchange Events (Request, Response)    │
│     Purpose: Analytics (cost, tokens, duration)              │
└──────────────────────────────────────────────────────────────┘
```

**Key Insight**: All layers observe the **same interaction** from different perspectives. You can subscribe to any layer(s) based on your use case.

---

## 📦 Installation

```bash
pnpm add @deepractice-ai/agentx-core
```

**Dependencies**:
- `@deepractice-ai/agentx-event` - Event type definitions
- `@deepractice-ai/agentx-types` - Message type definitions
- `rxjs` - Reactive programming library

**Note**: This is a **low-level package**. Most users should use platform-specific SDKs:
- `@deepractice-ai/agentx-node` - For Node.js with Claude SDK
- `@deepractice-ai/agentx-browser` - For browsers with WebSocket

---

## 🚀 Quick Start

### Basic Usage (with Driver Injection)

```typescript
import { AgentService } from "@deepractice-ai/agentx-core";
import { ClaudeDriver } from "@deepractice-ai/agentx-node";

// 1. Create driver (platform-specific)
const driver = new ClaudeDriver({
  apiKey: "your-api-key",
  model: "claude-3-5-sonnet-20241022"
});

// 2. Create agent with driver
const agent = new AgentService(driver);

// 3. Initialize agent
await agent.initialize();

// 4. Subscribe to events using react()
agent.react({
  onAssistantMessage(event) {
    console.log("Assistant:", event.data.content);
  },
});

// 5. Send messages
await agent.send("Hello, how are you?");

// 6. Clean up
await agent.destroy();
```

### With Logger

```typescript
import { AgentService } from "@deepractice-ai/agentx-core";
import { PinoLoggerProvider } from "@deepractice-ai/agentx-node";

const logger = new PinoLoggerProvider({ level: "debug" });
const agent = new AgentService(driver, logger);
```

### With Reactors (Auto-Binding)

```typescript
import { AgentService } from "@deepractice-ai/agentx-core";
import type { MessageReactor } from "@deepractice-ai/agentx-core";

// Implement Reactor interface
class ChatLogger implements MessageReactor {
  onUserMessage(event) {
    console.log("User:", event.data.content);
  }
  
  onAssistantMessage(event) {
    console.log("Assistant:", event.data.content);
  }
  
  onToolUseMessage(event) {
    console.log("Tool:", event.data.toolCall.name);
  }
  
  onErrorMessage(event) {
    console.error("Error:", event.data.message);
  }
}

// Pass reactors during initialization
const agent = new AgentService(driver, logger, {
  reactors: {
    message: [new ChatLogger()]
  }
});

await agent.initialize(); // Reactors auto-bind here
```

---

## 🎯 Core Components

### 1. AgentService - User-Facing API

**Purpose**: Simple, clean API for agent interactions.

**Methods**:

| Method | Description | Returns |
|--------|-------------|---------|
| `initialize()` | Initialize agent and start event pipeline | `Promise<void>` |
| `send(message: string)` | Send a message to the agent | `Promise<void>` |
| `react(reactor)` | Inject a Reactor to handle events (Partial supported) | `Unsubscribe` |
| `clear()` | Clear message history and abort | `void` |
| `destroy()` | Destroy agent and clean up | `Promise<void>` |

**Properties**:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique agent ID |
| `sessionId` | `string` | Session ID (from driver) |
| `messages` | `ReadonlyArray<Message>` | Message history |

**Example**:

```typescript
const agent = new AgentService(driver);
await agent.initialize();

// Subscribe to events using react()
const unsub = agent.react({
  onTextDelta(event) {
    process.stdout.write(event.data.text);
  },
});

// Send message
await agent.send("Tell me a joke");

// Unsubscribe
unsub();

// Clear history
agent.clear();

// Destroy
await agent.destroy();
```

---

### 2. AgentRuntime - Core Orchestration

**Purpose**: Manages EventBus, Driver, and 4-layer pipeline.

**Responsibilities**:
1. Create and manage EventBus
2. Connect Driver to EventBus
3. Create 4-layer event generation pipeline:
   - `AgentStateMachine` (Stream → State events)
   - `AgentMessageAssembler` (Stream → Message events)
   - `AgentExchangeTracker` (Message → Exchange events)
4. Lifecycle management (initialize, destroy)

**Architecture**:

```typescript
class AgentRuntime {
  readonly agentId: string;
  readonly sessionId: string;
  readonly eventBus: AgentEventBus;
  
  constructor(driver: AgentDriver, logger?: LoggerProvider, config?: RuntimeConfig);
  
  async initialize(): Promise<void>;
  abort(): void;
  async destroy(): Promise<void>;
}
```

**RuntimeConfig**:

```typescript
interface RuntimeConfig {
  reactors?: {
    stream?: StreamReactor[];
    state?: StateReactor[];
    message?: MessageReactor[];
    exchange?: ExchangeReactor[];
  };
}
```

**Example**:

```typescript
import { AgentRuntime } from "@deepractice-ai/agentx-core";

const runtime = new AgentRuntime(driver, logger, {
  reactors: {
    message: [new ChatLogger()],
    exchange: [new AnalyticsTracker()]
  }
});

await runtime.initialize();

// EventBus is now ready
const consumer = runtime.eventBus.createConsumer();
consumer.consumeByType("assistant_message", handleMessage);

await runtime.destroy();
```

---

### 3. AgentEventBus - Event Communication

**Purpose**: RxJS-based EventBus implementing Producer-Consumer pattern.

**Methods**:

```typescript
interface EventBus {
  createProducer(): EventProducer;
  createConsumer(): EventConsumer;
  close(): void;
  isClosed(): boolean;
}
```

**Producer**:

```typescript
interface EventProducer {
  produce(event: AgentEventType): void;
  isActive(): boolean;
}
```

**Consumer**:

```typescript
interface EventConsumer {
  // Consume all events
  consume(handler: (event: AgentEventType) => void): Unsubscribe;
  
  // Consume specific event type
  consumeByType<T extends AgentEventType>(
    type: T["type"],
    handler: (event: T) => void
  ): Unsubscribe;
  
  // Consume multiple event types
  consumeByTypes<T extends AgentEventType["type"]>(
    types: T[],
    handler: (event: Extract<AgentEventType, { type: T }>) => void
  ): Unsubscribe;
  
  isActive(): boolean;
}
```

**Example**:

```typescript
import { AgentEventBus } from "@deepractice-ai/agentx-core";

const bus = new AgentEventBus();
const producer = bus.createProducer();
const consumer = bus.createConsumer();

// Method 1: Consume all events
consumer.consume((event) => {
  console.log(`Event: ${event.type}`);
});

// Method 2: Consume specific type (type-safe)
consumer.consumeByType("user_message", (event) => {
  // TypeScript knows event is UserMessageEvent
  console.log("User:", event.data.content);
});

// Method 3: Consume multiple types
consumer.consumeByTypes(
  ["user_message", "assistant_message"],
  (event) => {
    // TypeScript narrows to UserMessageEvent | AssistantMessageEvent
    console.log(`Message from ${event.data.role}`);
  }
);

// Produce events
producer.produce({
  type: "user_message",
  uuid: "msg-123",
  agentId: "agent-1",
  timestamp: Date.now(),
  data: userMessage
});

// Clean up
bus.close();
```

---

### 4. AgentDriver - Platform Abstraction

**Purpose**: Platform-specific adapter for external AI services.

**Interface**:

```typescript
interface AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string;
  
  connect(eventBus: EventBus): Promise<void>;
  abort(): void;
  destroy(): Promise<void>;
}
```

**Implementations**:
- `ClaudeDriver` (in `@deepractice-ai/agentx-node`) - Adapts `@anthropic-ai/claude-agent-sdk`
- `WebSocketDriver` (in `@deepractice-ai/agentx-browser`) - Connects to WebSocket server

**How it works**:
1. Driver subscribes to outbound events (e.g., `user_message`)
2. Driver calls external API (e.g., Claude SDK)
3. Driver emits Stream events back to EventBus

**Example (ClaudeDriver)**:

```typescript
class ClaudeDriver implements AgentDriver {
  async connect(eventBus: EventBus): Promise<void> {
    const consumer = eventBus.createConsumer();
    const producer = eventBus.createProducer();
    
    // Subscribe to user messages
    consumer.consumeByType("user_message", async (event) => {
      // Call Claude SDK
      const stream = await claudeAgent.chat(event.data.content);
      
      // Emit Stream events
      for await (const chunk of stream) {
        producer.produce(convertToStreamEvent(chunk));
      }
    });
  }
}
```

---

## 🎭 Reactor Pattern - Type-Safe Event Handling

### What are Reactors?

**Reactors** are type-safe interfaces for handling events. Instead of manually calling `consumer.consumeByType()` for each event, you implement a **Reactor interface** and the system **automatically binds** all methods.

### Why Use Reactors?

**Problem with Manual Subscriptions**:
```typescript
// ❌ Easy to forget an event type
consumer.consumeByType("user_message", handleUser);
consumer.consumeByType("assistant_message", handleAssistant);
// Oops! Forgot to handle tool_use_message and error_message
```

**Solution with Reactors**:
```typescript
// ✅ TypeScript forces you to implement ALL methods
class ChatHandler implements MessageReactor {
  onUserMessage(event) { ... }
  onAssistantMessage(event) { ... }
  onToolUseMessage(event) { ... }
  onErrorMessage(event) { ... }  // Can't forget this!
}

// Auto-bind during initialization
const agent = new AgentService(driver, logger, {
  reactors: { message: [new ChatHandler()] }
});
```

### Four Reactor Interfaces

#### 1. StreamReactor - Handle Stream Events

```typescript
import type { StreamReactor } from "@deepractice-ai/agentx-core";

class StreamingUI implements StreamReactor {
  onMessageStart(event: MessageStartEvent): void { }
  onMessageDelta(event: MessageDeltaEvent): void { }
  onMessageStop(event: MessageStopEvent): void { }
  onTextContentBlockStart(event: TextContentBlockStartEvent): void { }
  onTextDelta(event: TextDeltaEvent): void { }
  onTextContentBlockStop(event: TextContentBlockStopEvent): void { }
  onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void { }
  onInputJsonDelta(event: InputJsonDeltaEvent): void { }
  onToolUseContentBlockStop(event: ToolUseContentBlockStopEvent): void { }
}
```

#### 2. StateReactor - Handle State Transitions

```typescript
import type { StateReactor } from "@deepractice-ai/agentx-core";

class StateMachine implements StateReactor {
  onAgentInitializing(event: AgentInitializingStateEvent): void { }
  onAgentReady(event: AgentReadyStateEvent): void { }
  onAgentDestroyed(event: AgentDestroyedStateEvent): void { }
  onConversationStart(event: ConversationStartStateEvent): void { }
  onConversationThinking(event: ConversationThinkingStateEvent): void { }
  onConversationResponding(event: ConversationRespondingStateEvent): void { }
  onConversationEnd(event: ConversationEndStateEvent): void { }
  onToolPlanned(event: ToolPlannedStateEvent): void { }
  onToolExecuting(event: ToolExecutingStateEvent): void { }
  onToolCompleted(event: ToolCompletedStateEvent): void { }
  onToolFailed(event: ToolFailedStateEvent): void { }
  onStreamStart(event: StreamStartStateEvent): void { }
  onStreamComplete(event: StreamCompleteStateEvent): void { }
  onErrorOccurred(event: ErrorOccurredStateEvent): void { }
}
```

#### 3. MessageReactor - Handle Messages

```typescript
import type { MessageReactor } from "@deepractice-ai/agentx-core";

class ChatHistory implements MessageReactor {
  onUserMessage(event: UserMessageEvent): void { }
  onAssistantMessage(event: AssistantMessageEvent): void { }
  onToolUseMessage(event: ToolUseMessageEvent): void { }
  onErrorMessage(event: ErrorMessageEvent): void { }
}
```

#### 4. ExchangeReactor - Handle Analytics

```typescript
import type { ExchangeReactor } from "@deepractice-ai/agentx-core";

class Analytics implements ExchangeReactor {
  onExchangeRequest(event: ExchangeRequestEvent): void { }
  onExchangeResponse(event: ExchangeResponseEvent): void { }
}
```

### Generic bindReactor Function

**NEW**: You can now use a single `bindReactor` function for any reactor:

```typescript
import { bindReactor } from "@deepractice-ai/agentx-core";

// Works with any object that has "on*" methods
const handler = {
  onTextDelta(event) { console.log(event.data.text); },
  onMessageStop(event) { console.log("Done!"); }
};

const consumer = eventBus.createConsumer();
const unbind = bindReactor(consumer, handler);

// Later: unbind all
unbind();
```

**How it works**:
1. Discovers all methods starting with "on"
2. Converts method name to event type: `onTextDelta` → `text_delta`
3. Automatically binds each method to corresponding event

**Benefits**:
- ✅ No need for separate `bindStreamReactor`, `bindMessageReactor`, etc.
- ✅ Works with partial implementations
- ✅ Automatic method discovery and binding
- ✅ Single `unbind()` function

---

## 📚 4-Layer Event Pipeline Details

### Layer 1: Stream Events (Driver Output)

**Source**: `AgentDriver`
**Purpose**: Incremental data transmission

**How it works**:
1. Driver receives external streaming data (e.g., from Claude SDK)
2. Driver emits Stream events (`MessageStartEvent`, `TextDeltaEvent`, etc.)
3. Other components consume these events

**Example**:
```typescript
// ClaudeDriver emits Stream events
producer.produce({
  type: "text_delta",
  uuid: generateId(),
  agentId: this.agentId,
  timestamp: Date.now(),
  data: { text: "Hello" }
});
```

---

### Layer 2: State Events (AgentStateMachine)

**Source**: `AgentStateMachine`
**Input**: Stream events
**Output**: State events

**How it works**:
1. StateMachine subscribes to Stream events
2. Tracks agent lifecycle (initializing → ready → thinking → responding)
3. Emits State events based on transitions

**Example**:
```typescript
// AgentStateMachine logic
consumer.consumeByType("message_start", (event) => {
  // Transition: thinking → responding
  producer.produce({
    type: "conversation_responding",
    previousState: "conversation_thinking",
    transition: { reason: "message_started" }
  });
});
```

---

### Layer 3: Message Events (AgentMessageAssembler)

**Source**: `AgentMessageAssembler`
**Input**: Stream events
**Output**: Message events

**How it works**:
1. MessageAssembler subscribes to Stream events
2. Accumulates deltas (text/tool input) during streaming
3. Emits complete Message events when streaming ends

**Example**:
```typescript
// AgentMessageAssembler logic
private textDeltas: string[] = [];

consumer.consumeByType("text_delta", (event) => {
  this.textDeltas.push(event.data.text);
});

consumer.consumeByType("message_stop", (event) => {
  const fullText = this.textDeltas.join("");
  
  producer.produce({
    type: "assistant_message",
    data: {
      id: generateId(),
      role: "assistant",
      content: fullText,
      timestamp: Date.now()
    }
  });
  
  this.textDeltas = [];
});
```

---

### Layer 4: Exchange Events (AgentExchangeTracker)

**Source**: `AgentExchangeTracker`
**Input**: Message events
**Output**: Exchange events

**How it works**:
1. ExchangeTracker subscribes to Message events
2. Pairs user requests with assistant responses
3. Calculates metrics (duration, cost, tokens)
4. Emits Exchange events

**Example**:
```typescript
// AgentExchangeTracker logic
consumer.consumeByType("user_message", (event) => {
  producer.produce({
    type: "exchange_request",
    exchangeId: generateId(),
    data: {
      userMessage: event.data,
      requestedAt: event.timestamp
    }
  });
});

consumer.consumeByType("assistant_message", (event) => {
  const duration = Date.now() - requestTime;
  const cost = calculateCost(event.data.usage);
  
  producer.produce({
    type: "exchange_response",
    exchangeId: currentExchangeId,
    data: {
      assistantMessage: event.data,
      respondedAt: Date.now(),
      durationMs: duration,
      costUsd: cost,
      usage: event.data.usage
    }
  });
});
```

---

## 🔧 Advanced Usage

### Custom Driver Implementation

```typescript
import type { AgentDriver, EventBus } from "@deepractice-ai/agentx-core";

class MyCustomDriver implements AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string;
  
  constructor() {
    this.sessionId = generateId();
    this.driverSessionId = generateId();
  }
  
  async connect(eventBus: EventBus): Promise<void> {
    const consumer = eventBus.createConsumer();
    const producer = eventBus.createProducer();
    
    // Subscribe to outbound events
    consumer.consumeByType("user_message", async (event) => {
      // Call your external API
      const response = await myAPI.chat(event.data.content);
      
      // Emit Stream events
      producer.produce({
        type: "text_delta",
        uuid: generateId(),
        agentId: event.agentId,
        timestamp: Date.now(),
        data: { text: response }
      });
    });
  }
  
  abort(): void {
    // Abort ongoing requests
  }
  
  async destroy(): Promise<void> {
    // Clean up resources
  }
}
```

### Direct EventBus Usage (Low-Level)

```typescript
import { AgentEventBus } from "@deepractice-ai/agentx-core";

const bus = new AgentEventBus();
const producer = bus.createProducer();
const consumer = bus.createConsumer();

// Low-level event production
producer.produce({
  type: "user_message",
  uuid: "msg-123",
  agentId: "agent-1",
  timestamp: Date.now(),
  data: {
    id: "user-msg-1",
    role: "user",
    content: "Hello",
    timestamp: Date.now()
  }
});

// Low-level event consumption
consumer.consume((event) => {
  console.log(`Received event: ${event.type}`);
});
```

### Multi-Layer Event Handling

```typescript
// Subscribe to multiple layers simultaneously
const consumer = runtime.eventBus.createConsumer();

// Stream layer: Real-time UI updates
consumer.consumeByType("text_delta", (event) => {
  updateStreamingText(event.data.text);
});

// State layer: Track agent state
consumer.consumeByType("conversation_thinking", (event) => {
  showThinkingIndicator();
});

// Message layer: Persist messages
consumer.consumeByType("assistant_message", (event) => {
  saveToDatabase(event.data);
});

// Exchange layer: Analytics
consumer.consumeByType("exchange_response", (event) => {
  trackCost(event.data.costUsd);
});
```

---

## 🧪 Testing

### Unit Testing Reactors

```typescript
import { describe, it, expect } from "vitest";
import { AgentEventBus } from "@deepractice-ai/agentx-core";

describe("ChatLogger", () => {
  it("should log user messages", () => {
    const bus = new AgentEventBus();
    const consumer = bus.createConsumer();
    const producer = bus.createProducer();
    
    const logger = new ChatLogger();
    bindReactor(consumer, logger);
    
    // Emit event
    producer.produce({
      type: "user_message",
      uuid: "test-1",
      agentId: "agent-1",
      timestamp: Date.now(),
      data: {
        id: "msg-1",
        role: "user",
        content: "Test message",
        timestamp: Date.now()
      }
    });
    
    // Assert logger received event
    expect(logger.lastUserMessage).toBe("Test message");
  });
});
```

### Integration Testing with Mock Driver

```typescript
class MockDriver implements AgentDriver {
  readonly sessionId = "test-session";
  readonly driverSessionId = "mock-driver";
  
  async connect(eventBus: EventBus): Promise<void> {
    const consumer = eventBus.createConsumer();
    const producer = eventBus.createProducer();
    
    consumer.consumeByType("user_message", (event) => {
      // Emit mock response
      producer.produce({
        type: "text_delta",
        uuid: generateId(),
        agentId: event.agentId,
        timestamp: Date.now(),
        data: { text: "Mock response" }
      });
    });
  }
  
  abort(): void { }
  async destroy(): Promise<void> { }
}

// Use in tests
const agent = new AgentService(new MockDriver());
await agent.initialize();
await agent.send("Test");
```

---

## 📊 Event Flow Diagram (Complete)

```
User sends "Hello"
      ↓
┌─────────────────────────────────────┐
│ AgentService.send()                 │
│ Creates UserMessage                 │
│ Emits UserMessageEvent              │
└─────────────┬───────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ EventBus                            │
│ Broadcasts to all consumers         │
└─────────────┬───────────────────────┘
              ├─────────────┬─────────────┬──────────────┐
              ▼             ▼             ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Driver  │  │  State   │  │ Message  │  │ Exchange │
        │          │  │ Machine  │  │ Assembler│  │ Tracker  │
        └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘
              ↓             ↓             ↓              ↓
        Stream Events  State Events  (stores)     ExchangeRequest
        (TextDelta)    (Thinking)                       ↓
              ↓             ↓                            ↓
        More Stream    More State                  (waits for
         Events         Events                      response)
              ↓             ↓                            ↓
        MessageStop    Responding                  AssistantMessage
              ↓             ↓                            ↓
        (triggers      ConversationEnd           ExchangeResponse
         assembly)                                (duration, cost)
              ↓
        AssistantMessageEvent
```

---

## 🔗 Related Packages

- **[@deepractice-ai/agentx-event](../agentx-event)** - Event type definitions and interfaces
- **[@deepractice-ai/agentx-types](../agentx-types)** - Message and content type definitions
- **[@deepractice-ai/agentx-node](../agentx-node)** - Node.js driver (Claude SDK adapter)
- **[@deepractice-ai/agentx-browser](../agentx-browser)** - Browser driver (WebSocket client)

---

## 📝 Design Principles

### 1. Platform-Agnostic Core
Core logic doesn't depend on Node.js or Browser APIs. Platform-specific code lives in drivers.

### 2. Event-Driven Architecture
All communication happens through events. Components are loosely coupled.

### 3. Layered Event Generation
Four independent layers generate events from different perspectives. Subscribe to what you need.

### 4. Type Safety
Full TypeScript support. Compile-time safety for all events and messages.

### 5. Dependency Injection
Drivers and reactors are injected, not hardcoded. Easy to test and extend.

### 6. Clean Lifecycle
Clear initialization and destruction. No memory leaks.

---

## 📄 License

MIT
