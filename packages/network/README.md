# @agentxjs/network

WebSocket communication layer for AgentX with reliable message delivery.

## Features

- **Reliable Message Delivery** - ACK-based confirmation with timeout handling
- **Cross-Platform Client** - Node.js and Browser support with auto-reconnect
- **Heartbeat** - Connection health monitoring via ping/pong
- **Modular Design** - Separate protocol, server, and client modules

## Installation

```bash
bun add @agentxjs/network
```

## Quick Start

### Server

```typescript
import { WebSocketServer } from "@agentxjs/network";

const server = new WebSocketServer({
  heartbeat: true,
  heartbeatInterval: 30000,
});

server.onConnection((connection) => {
  console.log("Client connected:", connection.id);

  connection.onMessage((message) => {
    console.log("Received:", message);
  });

  // Send with delivery confirmation
  connection.sendReliable(JSON.stringify({ type: "welcome" }), {
    onAck: () => console.log("Client received the message"),
    timeout: 5000,
    onTimeout: () => console.log("Client did not acknowledge"),
  });
});

await server.listen(5200);
```

### Client (Node.js)

```typescript
import { createWebSocketClient } from "@agentxjs/network";

const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
});

client.onMessage((message) => {
  console.log("Received:", message);
  // ACK is sent automatically for reliable messages
});

client.send(JSON.stringify({ type: "hello" }));
```

### Client (Browser)

```typescript
import { createWebSocketClient } from "@agentxjs/network";

const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  autoReconnect: true,
  maxReconnectionDelay: 10000,
});

client.onMessage((message) => {
  console.log("Received:", message);
});

client.onClose(() => {
  console.log("Disconnected, will auto-reconnect...");
});
```

## API Reference

### WebSocketServer

```typescript
import { WebSocketServer } from "@agentxjs/network";

const server = new WebSocketServer(options?: ChannelServerOptions);
```

**Options:**

| Option              | Type      | Default | Description                |
| ------------------- | --------- | ------- | -------------------------- |
| `heartbeat`         | `boolean` | `true`  | Enable ping/pong heartbeat |
| `heartbeatInterval` | `number`  | `30000` | Heartbeat interval in ms   |

**Methods:**

| Method                      | Description                    |
| --------------------------- | ------------------------------ |
| `listen(port, host?)`       | Start standalone server        |
| `attach(httpServer, path?)` | Attach to existing HTTP server |
| `onConnection(handler)`     | Register connection handler    |
| `broadcast(message)`        | Send to all connections        |
| `close()`                   | Close all connections          |
| `dispose()`                 | Release all resources          |

### WebSocketConnection

Server-side representation of a client connection.

```typescript
interface ChannelConnection {
  readonly id: string;

  // Basic send (fire-and-forget)
  send(message: string): void;

  // Reliable send with ACK
  sendReliable(message: string, options?: SendReliableOptions): void;

  // Event handlers
  onMessage(handler: (message: string) => void): Unsubscribe;
  onClose(handler: () => void): Unsubscribe;
  onError(handler: (error: Error) => void): Unsubscribe;

  close(): void;
}
```

**SendReliableOptions:**

```typescript
interface SendReliableOptions {
  onAck?: () => void; // Called when client acknowledges
  timeout?: number; // ACK timeout in ms (default: 5000)
  onTimeout?: () => void; // Called if ACK times out
}
```

### WebSocketClient

```typescript
import { createWebSocketClient } from "@agentxjs/network";

const client = await createWebSocketClient(options: ChannelClientOptions);
```

**Options:**

| Option                 | Type                 | Default          | Description                   |
| ---------------------- | -------------------- | ---------------- | ----------------------------- |
| `serverUrl`            | `string`             | required         | WebSocket server URL          |
| `autoReconnect`        | `boolean`            | `true` (browser) | Auto-reconnect on disconnect  |
| `minReconnectionDelay` | `number`             | `1000`           | Min delay between reconnects  |
| `maxReconnectionDelay` | `number`             | `10000`          | Max delay between reconnects  |
| `maxRetries`           | `number`             | `Infinity`       | Max reconnection attempts     |
| `connectionTimeout`    | `number`             | `4000`           | Connection timeout in ms      |
| `headers`              | `object \| function` | -                | Custom headers (Node.js only) |

**Methods:**

| Method               | Description              |
| -------------------- | ------------------------ |
| `send(message)`      | Send message to server   |
| `onMessage(handler)` | Handle incoming messages |
| `onOpen(handler)`    | Handle connection open   |
| `onClose(handler)`   | Handle connection close  |
| `onError(handler)`   | Handle errors            |
| `close()`            | Close connection         |
| `dispose()`          | Release all resources    |

## Reliable Message Protocol

The `sendReliable()` method provides guaranteed message delivery:

```
Server                              Client
   │                                   │
   │  ──── { __msgId, __payload } ──►  │
   │                                   │
   │  ◄──── { __ack: msgId } ────────  │
   │                                   │
   ▼ onAck() called                    ▼
```

**How it works:**

1. Server wraps message with unique `__msgId`
2. Client receives, extracts payload, auto-sends `__ack`
3. Server receives ACK, triggers `onAck` callback
4. If no ACK within timeout, triggers `onTimeout`

**Use cases:**

- Persist data only after client confirms receipt
- Track message delivery status
- Implement at-least-once delivery semantics

## Architecture

```
@agentxjs/network
├── protocol/
│   └── reliable-message.ts    # ACK protocol types
│
├── server/
│   ├── WebSocketConnection.ts # Connection with sendReliable
│   └── WebSocketServer.ts     # Server management
│
├── client/
│   ├── WebSocketClient.ts     # Node.js client
│   └── BrowserWebSocketClient.ts # Browser client with reconnect
│
└── factory.ts                 # createWebSocketClient
```

## Examples

### Attach to HTTP Server

```typescript
import { createServer } from "node:http";
import { WebSocketServer } from "@agentxjs/network";

const httpServer = createServer((req, res) => {
  res.end("HTTP endpoint");
});

const wsServer = new WebSocketServer();
wsServer.attach(httpServer, "/ws");

httpServer.listen(5200);
```

### Custom Headers (Node.js)

```typescript
const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  headers: {
    Authorization: "Bearer token123",
  },
});

// Or dynamic headers
const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  headers: async () => ({
    Authorization: `Bearer ${await getToken()}`,
  }),
});
```

### Reliable Delivery with Persistence

```typescript
server.onConnection((connection) => {
  // Only persist after client confirms receipt
  connection.sendReliable(JSON.stringify(event), {
    onAck: () => {
      database.save(event);
      console.log("Event persisted after client ACK");
    },
    timeout: 10000,
    onTimeout: () => {
      console.log("Client did not acknowledge, will retry...");
    },
  });
});
```

## Testing

```bash
bun test
```

52 tests covering:

- Protocol type guards
- Connection send/sendReliable
- ACK handling and timeouts
- Server lifecycle
- Client auto-ACK

## License

MIT
