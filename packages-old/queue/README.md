# @agentxjs/queue

Reliable event delivery queue for AgentX with in-memory pub/sub and SQLite persistence.

## Overview

`@agentxjs/queue` provides a traditional message queue implementation optimized for real-time event delivery with persistence guarantees:

- **RxJS-based pub/sub** for instant real-time delivery
- **SQLite persistence** for recovery after disconnection
- **Consumer cursor tracking** for at-least-once delivery semantics
- **Topic isolation** for multi-session/multi-channel support

## Installation

```bash
bun add @agentxjs/queue
```

**Requirements:** Node.js 22+ or Bun

## Quick Start

```typescript
import { createQueue } from "@agentxjs/queue";

// Create a queue with SQLite persistence
const queue = createQueue({ path: "./data/queue.db" });

// Subscribe to real-time events
queue.subscribe("session-123", (entry) => {
  console.log("Event:", entry.event);
  console.log("Cursor:", entry.cursor);
});

// Publish events (persists + broadcasts)
const cursor = queue.publish("session-123", {
  type: "message",
  text: "Hello!",
});

// Acknowledge after processing
await queue.ack("consumer-1", "session-123", cursor);

// Clean up
await queue.close();
```

## Features

### Real-Time Pub/Sub

Events are delivered instantly to all subscribers via RxJS Subject:

```typescript
// Multiple subscribers receive the same event
queue.subscribe("topic", (entry) => logToConsole(entry));
queue.subscribe("topic", (entry) => saveToAnalytics(entry));

queue.publish("topic", { data: "broadcast" });
```

### Persistence & Recovery

All events are persisted to SQLite for recovery on reconnection:

```typescript
// On reconnection, get last acknowledged position
const lastCursor = await queue.getCursor("client-id", "session-123");

// Recover all events after that cursor
const missed = await queue.recover("session-123", lastCursor);

for (const entry of missed) {
  processEvent(entry.event);
  await queue.ack("client-id", "session-123", entry.cursor);
}

// Resume real-time subscription
queue.subscribe("session-123", handler);
```

### Consumer Cursor Tracking

Each consumer tracks its position independently:

```typescript
const queue = createQueue({ path: "./queue.db" });

// Consumer A processes slowly
queue.subscribe("topic", async (entry) => {
  await slowProcess(entry.event);
  await queue.ack("consumer-a", "topic", entry.cursor);
});

// Consumer B processes fast
queue.subscribe("topic", (entry) => {
  fastProcess(entry.event);
  queue.ack("consumer-b", "topic", entry.cursor);
});

// Each consumer maintains independent position
```

### Topic Isolation

Events are isolated by topic, typically used as sessionId or channelId:

```typescript
queue.subscribe("session-1", handler1);
queue.subscribe("session-2", handler2);

// Only handler1 receives this
queue.publish("session-1", { msg: "for session 1" });

// Only handler2 receives this
queue.publish("session-2", { msg: "for session 2" });
```

## API Reference

### `createQueue(options: QueueOptions): EventQueue`

Creates a new EventQueue instance.

```typescript
interface QueueOptions {
  // SQLite database path (use ":memory:" for testing)
  path: string;

  // Message retention period (default: 24 hours)
  retentionMs?: number;

  // Cleanup interval (default: 5 minutes, 0 to disable)
  cleanupIntervalMs?: number;
}
```

### `EventQueue` Methods

| Method                                                        | Description                       |
| ------------------------------------------------------------- | --------------------------------- |
| `publish(topic, event): string`                               | Publish event, returns cursor     |
| `subscribe(topic, handler): Unsubscribe`                      | Subscribe to real-time events     |
| `ack(consumerId, topic, cursor): Promise<void>`               | Acknowledge consumption           |
| `getCursor(consumerId, topic): Promise<string \| null>`       | Get consumer's last cursor        |
| `recover(topic, afterCursor?, limit?): Promise<QueueEntry[]>` | Fetch historical events           |
| `close(): Promise<void>`                                      | Close queue and release resources |

### `QueueEntry`

```typescript
interface QueueEntry {
  cursor: string; // Monotonic cursor (e.g., "lq5x4g2-0001")
  topic: string; // Topic identifier
  event: unknown; // Event payload
  timestamp: number; // Unix milliseconds
}
```

### `CursorGenerator`

Utility class for generating monotonically increasing cursors:

```typescript
import { CursorGenerator } from "@agentxjs/queue";

const gen = new CursorGenerator();
const cursor1 = gen.generate(); // "lq5x4g2-0000"
const cursor2 = gen.generate(); // "lq5x4g2-0001"

// Compare cursors (lexicographic = temporal order)
CursorGenerator.compare(cursor1, cursor2); // negative (cursor1 < cursor2)
```

## Architecture

```
publish(topic, event)
    │
    ├──► SQLite (sync persist)
    │
    └──► RxJS Subject (broadcast)
              │
              └──► Subscribers (real-time)

Reconnection:
    getCursor(consumerId, topic) → recover(topic, cursor) → subscribe()
```

**Design Principles:**

- **In-memory = Fast**: RxJS Subject for instant delivery
- **SQLite = Reliable**: Sync writes ensure persistence before broadcast
- **Decoupled**: No network protocol dependency; caller controls ACK timing

## Testing

```bash
cd packages/queue
bun test
```

## Related Packages

- [@agentxjs/network](../network) - WebSocket with reliable delivery (uses queue for ACK)
- [@agentxjs/common](../common) - SQLite abstraction used by queue
- [@agentxjs/types](../types) - Type definitions

## License

MIT
