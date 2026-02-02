# @agentxjs/network

WebSocket communication layer for AgentX with reliable message delivery.

## Features

- **Reliable Message Delivery** - ACK-based confirmation with timeout handling
- **Cross-Platform Client** - Node.js and Browser support with environment auto-detection
- **Auto-Reconnect** - Browser client with exponential backoff reconnection
- **Heartbeat** - Connection health monitoring via ping/pong
- **Custom Headers** - Authentication support (handshake in Node.js, first message in Browser)

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

### Client

```typescript
import { createWebSocketClient } from "@agentxjs/network";

// Factory auto-detects environment (Node.js or Browser)
const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  autoReconnect: true, // Default: true in Browser
});

client.onMessage((message) => {
  console.log("Received:", message);
  // ACK is sent automatically for reliable messages
});

client.send(JSON.stringify({ type: "hello" }));
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
| `debug`             | `boolean` | `false` | Enable debug logging       |

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

  // Fire-and-forget send
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

### createWebSocketClient

Factory function that auto-detects environment.

```typescript
import { createWebSocketClient } from "@agentxjs/network";

const client = await createWebSocketClient(options: ChannelClientOptions);
```

**Options:**

| Option                 | Type                 | Default          | Description                  |
| ---------------------- | -------------------- | ---------------- | ---------------------------- |
| `serverUrl`            | `string`             | required         | WebSocket server URL         |
| `autoReconnect`        | `boolean`            | `true` (browser) | Auto-reconnect on disconnect |
| `minReconnectionDelay` | `number`             | `1000`           | Min delay between reconnects |
| `maxReconnectionDelay` | `number`             | `10000`          | Max delay between reconnects |
| `maxRetries`           | `number`             | `Infinity`       | Max reconnection attempts    |
| `connectionTimeout`    | `number`             | `4000`           | Connection timeout in ms     |
| `headers`              | `object \| function` | -                | Custom headers (see below)   |
| `debug`                | `boolean`            | `false`          | Enable debug logging         |

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
   |                                   |
   |  ---- { __msgId, __payload } -->  |
   |                                   |
   |  <---- { __ack: msgId } --------  |
   |                                   |
   v onAck() called                    v
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

### Custom Headers

```typescript
// Static headers (Node.js only during handshake)
const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  headers: {
    Authorization: "Bearer token123",
  },
});

// Dynamic headers (sync or async function)
const client = await createWebSocketClient({
  serverUrl: "ws://localhost:5200",
  headers: async () => ({
    Authorization: `Bearer ${await getToken()}`,
  }),
});
```

> **Note:** In browsers, headers are sent as the first message after connection (WebSocket API limitation). The server should handle `{ type: "auth", headers: {...} }` messages.

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

## Architecture

```
@agentxjs/network
├── protocol/
│   └── reliable-message.ts      # ACK protocol types and guards
│
├── server/
│   ├── WebSocketConnection.ts   # Connection with sendReliable
│   └── WebSocketServer.ts       # Server management
│
├── client/
│   ├── WebSocketClient.ts       # Node.js client (ws library)
│   └── BrowserWebSocketClient.ts # Browser client (reconnecting-websocket)
│
└── factory.ts                   # createWebSocketClient (auto-detect)
```

## Dependencies

- `ws` - WebSocket implementation for Node.js
- `reconnecting-websocket` - Auto-reconnect for browser clients
- `@agentxjs/common` - Logger utilities
- `@agentxjs/types` - Type definitions

## Related

- [AgentX Repository](https://github.com/Deepractice/AgentX)
- [@agentxjs/queue](../queue) - Event queue with persistence

## License

MIT
