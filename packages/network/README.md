# @agentxjs/network

Network channel abstraction for AgentX - WebSocket-based client-server communication with channel support.

## Features

- **Transport-agnostic interfaces** - Can be implemented with WebSocket, HTTP/2, gRPC, etc.
- **Channel-based routing** - Publish/subscribe to specific channels (e.g., sessions, groups)
- **Connection management** - Auto cleanup on disconnect, heartbeat support
- **Cross-platform** - Node.js and browser support

## Installation

```bash
bun add @agentxjs/network
```

## API

### ChannelServer

Server-side interface for accepting connections and managing channels.

```typescript
import { WebSocketServer } from "@agentxjs/network";

const server = new WebSocketServer({
  heartbeat: true,
  heartbeatInterval: 30000,
});

await server.listen(5200);
```

#### Methods

**Connection Management**

- `listen(port: number, host?: string): Promise<void>` - Start listening on a port
- `attach(server: HTTPServer, path?: string): void` - Attach to existing HTTP server
- `onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe` - Register connection handler
- `close(): Promise<void>` - Close server and all connections
- `dispose(): Promise<void>` - Dispose resources

**Broadcasting**

- `broadcast(message: string): void` - Send to all connected clients

**Channel Support**

- `subscribe(connection: ChannelConnection, channelId: string): void` - Subscribe connection to a channel
- `publish(channelId: string, message: string): void` - Publish message to channel subscribers
- `unsubscribe(connection: ChannelConnection, channelId: string): void` - Unsubscribe connection from channel

### ChannelConnection

Client connection representation with unique ID.

```typescript
interface ChannelConnection {
  readonly id: string; // Unique connection ID

  send(message: string): void;
  onMessage(handler: (message: string) => void): Unsubscribe;
  onClose(handler: () => void): Unsubscribe;
  onError(handler: (error: Error) => void): Unsubscribe;
  close(): void;
}
```

## Usage Examples

### Basic Server

```typescript
import { WebSocketServer } from "@agentxjs/network";

const server = new WebSocketServer();

server.onConnection((connection) => {
  console.log("Client connected:", connection.id);

  connection.onMessage((message) => {
    console.log("Received:", message);
    connection.send("Echo: " + message);
  });

  connection.onClose(() => {
    console.log("Client disconnected:", connection.id);
  });
});

await server.listen(5200);
```

### Channel-based Pub/Sub

```typescript
const server = new WebSocketServer();

server.onConnection((connection) => {
  connection.onMessage((message) => {
    const { type, channelId, data } = JSON.parse(message);

    if (type === "subscribe") {
      // Subscribe to a channel (e.g., sessionId, groupId)
      server.subscribe(connection, channelId);
      console.log(`${connection.id} subscribed to ${channelId}`);
    }

    if (type === "unsubscribe") {
      server.unsubscribe(connection, channelId);
    }
  });
});

// Publish to specific channel
server.publish(
  "session-123",
  JSON.stringify({
    type: "message",
    content: "Hello",
  })
);
// Only connections subscribed to "session-123" will receive this
```

### Auto Cleanup

Connections are automatically unsubscribed from all channels when disconnected:

```typescript
server.onConnection((connection) => {
  server.subscribe(connection, "channel-1");
  server.subscribe(connection, "channel-2");

  // When connection closes, automatically unsubscribed from both channels
});
```

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

## Channel Semantics

### Channel Identifier

A `channelId` is an arbitrary string identifying a logical channel:

- Single chat: `channelId = sessionId`
- Group chat: `channelId = groupId`
- System notifications: `channelId = "system"`
- Custom: any string

### Multiple Subscriptions

- A connection can subscribe to multiple channels
- Multiple connections can subscribe to the same channel
- Duplicate subscriptions are idempotent (Set-based)

### Lifecycle

```
subscribe(conn, channelId)
    ↓
channels[channelId] = Set(conn, ...)
    ↓
publish(channelId, msg) → send to all in Set
    ↓
conn.close() → auto unsubscribe from all channels
```

## Architecture

```
┌─────────────────────────────────────┐
│  ChannelServer (Interface)          │
│  - Transport-agnostic abstraction   │
└─────────────────────────────────────┘
                ↓ implements
┌─────────────────────────────────────┐
│  WebSocketServer                    │
│  - connections: Set<Connection>     │
│  - channels: Map<channelId, Set>    │
│                                     │
│  subscribe(conn, channelId)         │
│  publish(channelId, message)        │
│  unsubscribe(conn, channelId)       │
└─────────────────────────────────────┘
                ↓ uses
┌─────────────────────────────────────┐
│  WebSocketConnection                │
│  - Wraps ws.WebSocket               │
│  - Heartbeat support                │
│  - Event handlers (message/close)   │
└─────────────────────────────────────┘
```

## License

MIT
