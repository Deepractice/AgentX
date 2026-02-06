# @agentxjs/server

WebSocket server for AgentX. Exposes a JSON-RPC 2.0 API for managing containers, images, agents, and messages. Stream events from running agents are broadcast to subscribed clients.

## Overview

`@agentxjs/server` creates a WebSocket server that accepts client connections, handles JSON-RPC requests via a `CommandHandler`, and broadcasts LLM stream events as JSON-RPC notifications. It supports two startup modes: standalone (own port) and attached (existing HTTP server).

## Quick Start

### Standalone Mode

```typescript
import { createServer } from "@agentxjs/server";
import { nodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";
import type { CreateDriver } from "@agentxjs/core/driver";

const apiKey = process.env.ANTHROPIC_API_KEY!;

const wrappedCreateDriver: CreateDriver = (config) => {
  return createMonoDriver({
    ...config,
    apiKey,
    options: { provider: "anthropic" },
  });
};

const server = await createServer({
  platform: nodePlatform({ dataPath: "./data" }),
  createDriver: wrappedCreateDriver,
  port: 5200,
});

await server.listen();
// Server listening on ws://0.0.0.0:5200
```

### Attached Mode (Express / Next.js / Hono)

Attach to an existing HTTP server instead of opening a new port:

```typescript
import { createServer as createHttpServer } from "http";
import { createServer } from "@agentxjs/server";
import { nodePlatform } from "@agentxjs/node-platform";

const httpServer = createHttpServer();

const server = await createServer({
  platform: nodePlatform({ dataPath: "./data" }),
  createDriver: wrappedCreateDriver,
  server: httpServer,     // attach here
  wsPath: "/ws",          // WebSocket upgrade path (default: "/ws")
});

// The HTTP server handles listen()
httpServer.listen(3000);
```

### CLI Binary

```bash
ANTHROPIC_API_KEY=sk-ant-xxx bun run packages/server/bin/server.ts
```

## API Reference

### `createServer(config: ServerConfig): Promise<AgentXServer>`

Creates and returns an AgentX server instance.

### `AgentXServer`

```typescript
interface AgentXServer {
  listen(port?: number, host?: string): Promise<void>;  // standalone only
  close(): Promise<void>;
  dispose(): Promise<void>;                              // full cleanup
}
```

### `CommandHandler`

Maps JSON-RPC methods to runtime operations. Exported for advanced use (e.g., custom transports).

```typescript
import { CommandHandler } from "@agentxjs/server";
```

## Configuration

### ServerConfig

```typescript
interface ServerConfig {
  platform: AgentXPlatform | DeferredPlatformConfig;
  createDriver: CreateDriver;
  port?: number;                    // default: 5200
  host?: string;                    // default: "0.0.0.0"
  server?: MinimalHTTPServer;       // attach to existing server
  wsPath?: string;                  // default: "/ws" (attached mode)
  debug?: boolean;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `platform` | `AgentXPlatform \| DeferredPlatformConfig` | -- | Platform with repositories and event bus |
| `createDriver` | `CreateDriver` | -- | Factory function that creates a Driver per agent |
| `port` | `number` | `5200` | Standalone listen port |
| `host` | `string` | `"0.0.0.0"` | Standalone bind host |
| `server` | `MinimalHTTPServer` | -- | Existing HTTP server to attach to |
| `wsPath` | `string` | `"/ws"` | WebSocket path in attached mode |
| `debug` | `boolean` | `false` | Enable debug logging |

### Environment Variables (CLI)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | -- | Claude API key |
| `ANTHROPIC_BASE_URL` | No | -- | Custom API endpoint |
| `PORT` | No | `5200` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `DATA_PATH` | No | `./data` | Data storage directory |
| `LOG_DIR` | No | `<DATA_PATH>/logs` | Log file directory |
| `LOG_LEVEL` | No | `info` | `debug` / `info` / `warn` / `error` |
