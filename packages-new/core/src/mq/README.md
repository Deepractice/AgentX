# @agentxjs/core/mq

MessageQueue - Reliable message delivery with persistence guarantee.

## Overview

The mq module provides standard interfaces for message queue implementations. It defines platform-agnostic contracts that can be implemented by different providers:

- **Node.js**: SQLite persistence
- **Cloudflare Workers**: Durable Objects Storage
- **Browser**: IndexedDB

```
┌─────────────────────────────────────────────────────────────┐
│                      MessageQueue                            │
│                                                              │
│   publish() ─────► Storage ─────► recover()                 │
│       │              │                                       │
│       ▼              │                                       │
│   RxJS Subject ──────┼────► subscribe()                     │
│                      │                                       │
│   ack() ◄────────────┴────► getOffset()                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### At-Least-Once Delivery

Messages are guaranteed to be delivered at least once through:

1. **Persistence**: Messages are stored before broadcast
2. **Offset Tracking**: Consumer position is persisted via `ack()`
3. **Recovery**: Missed messages can be fetched via `recover()`

### Real-time + Recovery

```typescript
// 1. Subscribe for real-time messages
queue.subscribe("session-123", (entry) => {
  console.log("Received:", entry.event);
  // After processing, acknowledge
  await queue.ack("client-1", "session-123", entry.offset);
});

// 2. On reconnect, recover missed messages
const lastOffset = await queue.getOffset("client-1", "session-123");
const missed = await queue.recover("session-123", lastOffset);
for (const entry of missed) {
  console.log("Missed:", entry.event);
}
```

## Interfaces

### MessageQueue

```typescript
interface MessageQueue {
  // Publish message (async for cross-platform support)
  publish(topic: string, event: unknown): Promise<string>;

  // Subscribe to real-time messages (in-memory pub/sub)
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;

  // Acknowledge consumption (persist consumer offset)
  ack(consumerId: string, topic: string, offset: string): Promise<void>;

  // Get consumer's current offset
  getOffset(consumerId: string, topic: string): Promise<string | null>;

  // Recover historical messages
  recover(topic: string, afterOffset?: string, limit?: number): Promise<QueueEntry[]>;

  // Close and release resources
  close(): Promise<void>;
}
```

### QueueEntry

```typescript
interface QueueEntry {
  readonly offset: string;    // Unique, monotonically increasing
  readonly topic: string;     // Topic identifier
  readonly event: unknown;    // Message payload
  readonly timestamp: number; // Unix milliseconds
}
```

### MessageQueueProvider

```typescript
interface MessageQueueProvider {
  createQueue(config?: QueueConfig): Promise<MessageQueue>;
}
```

## Usage with Provider

```typescript
// Node.js
import { createNodeProvider } from "@agentxjs/node";

const provider = createNodeProvider({
  sqlitePath: "./data/queue.db"
});
const queue = await provider.createQueue({ retentionMs: 86400000 });

// Cloudflare Workers
import { createCloudflareProvider } from "@agentxjs/cloudflare";

const provider = createCloudflareProvider(env);
const queue = await provider.createQueue();
```

## OffsetGenerator

Utility for generating monotonically increasing offsets:

```typescript
import { OffsetGenerator } from "@agentxjs/core/mq";

const generator = new OffsetGenerator();

const offset1 = generator.generate(); // "lq5x4g2-0000"
const offset2 = generator.generate(); // "lq5x4g2-0001"

// Compare offsets
OffsetGenerator.compare(offset1, offset2); // -1 (offset1 < offset2)
```

### Offset Format

```
{timestamp_base36}-{sequence_padded}
     lq5x4g2      -     0001

- timestamp: Base36 encoded Unix milliseconds
- sequence: Zero-padded counter for same-millisecond uniqueness
```

## Difference from EventBus

| | EventBus | MessageQueue |
|--|----------|--------------|
| Scope | Process-internal | Cross-process |
| Persistence | None | Platform-specific |
| Delivery | Best-effort | At-least-once |
| Recovery | No | Yes (via offset) |
| Use case | Component decoupling | Reliable delivery |

## Platform Independence

This module defines **interfaces only** - no platform-specific code:

- No `node:*` imports
- No `bun:*` imports
- No SQLite, IndexedDB, or Durable Objects

Implementations are provided by platform packages (`@agentxjs/node`, `@agentxjs/cloudflare`).

## License

MIT
