# @agentxjs/queue

Event queue with in-memory pub/sub and SQLite persistence for AgentX.

## Features

- **In-Memory Pub/Sub** - RxJS Subject for real-time event delivery
- **SQLite Persistence** - Reliable storage for reconnection recovery
- **Consumer Tracking** - At-least-once delivery with cursor-based ACK
- **Cross-Runtime** - Works on Bun and Node.js 22+

## Installation

```bash
bun add @agentxjs/queue
```

## Quick Start

```typescript
import { createQueue } from "@agentxjs/queue";

const queue = createQueue({ path: "./data/queue.db" });

// Subscribe to events
queue.subscribe("session-123", (entry) => {
  console.log("Received:", entry.event);
  console.log("Cursor:", entry.cursor);
});

// Publish events
const cursor = queue.publish("session-123", { type: "message", text: "hello" });

// ACK after processing
await queue.ack("client-1", "session-123", cursor);

// Recover on reconnection
const lastCursor = await queue.getCursor("client-1", "session-123");
const missed = await queue.recover("session-123", lastCursor);
```

## API

### `createQueue(options: QueueOptions): EventQueue`

Create an event queue instance.

**Options:**

```typescript
interface QueueOptions {
  path: string; // SQLite database path
  retentionMs?: number; // Message retention (default: 24h)
  cleanupIntervalMs?: number; // Cleanup interval (default: 5min)
}
```

### `EventQueue`

**Methods:**

| Method                                 | Description                       |
| -------------------------------------- | --------------------------------- |
| `publish(topic, event)`                | Publish event, returns cursor     |
| `subscribe(topic, handler)`            | Subscribe to real-time events     |
| `ack(consumerId, topic, cursor)`       | Acknowledge consumption           |
| `getCursor(consumerId, topic)`         | Get consumer's cursor             |
| `recover(topic, afterCursor?, limit?)` | Fetch historical events           |
| `close()`                              | Close queue and release resources |

**Entry Format:**

```typescript
interface QueueEntry {
  cursor: string; // Monotonic cursor
  topic: string; // Topic identifier
  event: unknown; // Event payload
  timestamp: number; // Unix milliseconds
}
```

## Architecture

```
Event → publish() → SQLite (persist) → RxJS Subject (broadcast)
                                              ↓
                                       Subscribers (real-time)

Client disconnect → reconnect → getCursor() → recover(afterCursor)
```

**Key Points:**

- **In-memory = Fast**: Events broadcast via RxJS Subject
- **SQLite = Reliable**: Persistence for recovery guarantee
- **Consumer Cursor**: Tracks each consumer's position independently
- **Decoupled**: No network protocol dependency

## Example: Multi-Consumer

```typescript
const queue = createQueue({ path: "./queue.db" });

// Consumer A
queue.subscribe("session-1", (entry) => {
  processEvent(entry.event);
  queue.ack("consumer-a", "session-1", entry.cursor);
});

// Consumer B (independent position)
queue.subscribe("session-1", (entry) => {
  logEvent(entry.event);
  queue.ack("consumer-b", "session-1", entry.cursor);
});

// Both receive same events, track position independently
queue.publish("session-1", { type: "data", value: 123 });
```

## Example: Reconnection Recovery

```typescript
// Before disconnect
queue.subscribe("session-1", (entry) => {
  console.log(entry.event);
  queue.ack("my-client", "session-1", entry.cursor);
});

// ... disconnect ...

// On reconnect
const lastCursor = await queue.getCursor("my-client", "session-1");
const missed = await queue.recover("session-1", lastCursor);

// Replay missed events
for (const entry of missed) {
  console.log("Missed:", entry.event);
}

// Resume subscription
queue.subscribe("session-1", handler);
```

## Testing

```bash
bun test
```

13 tests covering:

- Publish/subscribe
- Consumer ACK tracking
- Historical recovery
- Topic isolation

## License

MIT
