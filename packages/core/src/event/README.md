# @agentxjs/core/event

Event System for AgentX - Pure memory EventBus with typed events.

## Overview

The event module provides a central event bus for component communication within a process. It's a pure in-memory pub/sub system using RxJS, with no platform dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                        EventBus                              │
│                                                              │
│   Producer ──emit()──► Subject ──dispatch()──► Consumers    │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │  Filter     │                          │
│                    │  Priority   │                          │
│                    │  Once       │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Event-Driven Architecture

All components communicate through typed events:

| Source        | Events            | Examples                                   |
| ------------- | ----------------- | ------------------------------------------ |
| `environment` | LLM API responses | `message_start`, `text_delta`, `tool_call` |
| `agent`       | Agent internal    | `conversation_start`, `assistant_message`  |
| `session`     | Session lifecycle | `session_created`, `session_saved`         |
| `container`   | Container ops     | `container_created`, `agent_registered`    |
| `command`     | Request/Response  | `container_create_request/response`        |

### Producer/Consumer Pattern

```typescript
// Producer - can only emit events
class ClaudeReceptor {
  constructor(private producer: EventProducer) {}

  onChunk(text: string) {
    this.producer.emit({
      type: "text_delta",
      timestamp: Date.now(),
      data: { text },
      source: "environment",
      category: "stream",
      intent: "notification",
    });
  }
}

// Consumer - can only subscribe to events
class BusDriver {
  constructor(consumer: EventConsumer) {
    consumer.on("text_delta", (e) => {
      console.log("Received:", e.data.text);
    });
  }
}
```

## Usage

### Basic Usage

```typescript
import { EventBus } from "@agentxjs/core/event";

const bus = new EventBus();

// Subscribe to specific event type
bus.on("text_delta", (event) => {
  console.log("Text:", event.data.text);
});

// Subscribe to all events
bus.onAny((event) => {
  console.log("Event:", event.type);
});

// Emit event
bus.emit({
  type: "text_delta",
  timestamp: Date.now(),
  data: { text: "Hello!" },
  source: "environment",
  category: "stream",
  intent: "notification",
});
```

### Subscription Options

```typescript
// Filter events
bus.on("text_delta", handler, {
  filter: (e) => e.context?.agentId === "agent-1",
});

// Priority (higher runs first)
bus.on("text_delta", criticalHandler, { priority: 10 });
bus.on("text_delta", normalHandler, { priority: 0 });

// One-time subscription
bus.once("message_stop", (e) => {
  console.log("Stream ended");
});
```

### Command Request/Response

```typescript
// Send request and wait for response
const response = await bus.request(
  "container_create_request",
  {
    containerId: "my-container",
  },
  30000
); // 30s timeout

console.log("Created:", response.data.containerId);
```

### Restricted Views

```typescript
const bus = new EventBus();

// Give producer to components that emit
const receptor = new ClaudeReceptor(bus.asProducer());

// Give consumer to components that subscribe
const driver = new BusDriver(bus.asConsumer());
```

## Architecture

### Directory Structure

```
event/
├── types/
│   ├── index.ts        # Re-exports all types
│   ├── base.ts         # SystemEvent, EventSource, EventContext
│   ├── bus.ts          # EventBus, EventProducer, EventConsumer
│   ├── agent.ts        # Agent stream/state/message/turn events
│   ├── session.ts      # Session lifecycle/persist/action events
│   ├── container.ts    # Container lifecycle/sandbox events
│   ├── command.ts      # Request/Response events + CommandEventMap
│   └── environment.ts  # DriveableEvent, ConnectionEvent, StopReason
│
├── EventBus.ts         # RxJS-based implementation
├── __tests__/
└── index.ts
```

### Type Hierarchy

```
BusEvent (simple)
└── { type, timestamp, data }

SystemEvent (full)
└── { type, timestamp, data, source, category, intent, context?, broadcastable? }
```

## API Reference

### EventBus

```typescript
class EventBus implements EventBusInterface {
  // Emit
  emit(event: BusEvent): void;
  emitBatch(events: BusEvent[]): void;
  emitCommand<T>(type: T, data: CommandEventMap[T]["data"]): void;

  // Subscribe
  on(type: string, handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;
  on(types: string[], handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;
  once(type: string, handler: BusEventHandler): Unsubscribe;
  onCommand<T>(type: T, handler: (event: CommandEventMap[T]) => void): Unsubscribe;

  // Request/Response
  request<T>(type: T, data: RequestDataFor<T>, timeout?: number): Promise<ResponseEventFor<T>>;

  // Views
  asProducer(): EventProducer;
  asConsumer(): EventConsumer;

  // Lifecycle
  destroy(): void;
}
```

### SubscribeOptions

```typescript
interface SubscribeOptions<E> {
  filter?: (event: E) => boolean; // Filter events
  priority?: number; // Execution order (higher first)
  once?: boolean; // Auto-unsubscribe after first
}
```

## Platform Independence

This module has **zero platform dependencies**:

- No `node:*` imports
- No `bun:*` imports
- Only depends on `rxjs` (pure JavaScript)

Can run in: Node.js, Bun, Deno, Cloudflare Workers, Browser.

## Not a Message Queue

EventBus is for **in-process** communication only:

|             | EventBus             | MessageQueue      |
| ----------- | -------------------- | ----------------- |
| Scope       | Process-internal     | Cross-process     |
| Persistence | None                 | SQLite/Redis      |
| Delivery    | Best-effort          | At-least-once     |
| Use case    | Component decoupling | Reliable delivery |

For cross-process or persistent messaging, use the `mq` module.

## License

MIT
