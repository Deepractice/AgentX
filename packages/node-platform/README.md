# @agentxjs/node-platform

Node.js runtime platform for AgentX. Provides concrete implementations of persistence (SQLite), bash execution, networking (WebSocket), message queue, and logging.

## Overview

`@agentxjs/node-platform` assembles platform-specific components into an `AgentXPlatform` instance that the AgentX runtime requires. It handles storage, shell execution, and event infrastructure -- the driver (LLM) is injected separately.

## Quick Start

```typescript
import { createNodePlatform } from "@agentxjs/node-platform";

const platform = await createNodePlatform({
  dataPath: "./data",
});

// platform.containerRepository  -- SQLite container storage
// platform.imageRepository      -- SQLite image storage
// platform.sessionRepository    -- SQLite session + message storage
// platform.eventBus             -- In-memory EventBus
// platform.bashProvider         -- Shell execution via execa
```

### Deferred Initialization

Use `nodePlatform()` for lazy initialization (e.g., when passing to `createServer`):

```typescript
import { nodePlatform } from "@agentxjs/node-platform";
import { createServer } from "@agentxjs/server";

const server = await createServer({
  platform: nodePlatform({ dataPath: "./data" }),  // resolved lazily
  createDriver: myCreateDriver,
});
```

## API Reference

### `createNodePlatform(options?): Promise<AgentXPlatform>`

Immediately creates and returns a fully initialized platform.

### `nodePlatform(options?): DeferredPlatformConfig`

Returns a deferred config. Call `.resolve()` to initialize.

### `isDeferredPlatform(value): value is DeferredPlatformConfig`

Type guard for deferred platform configs.

### Returned `AgentXPlatform`

| Property | Type | Description |
|---|---|---|
| `containerRepository` | `ContainerRepository` | Container CRUD (SQLite) |
| `imageRepository` | `ImageRepository` | Image CRUD (SQLite) |
| `sessionRepository` | `SessionRepository` | Session + message CRUD (SQLite) |
| `eventBus` | `EventBus` | In-memory pub/sub |
| `bashProvider` | `BashProvider` | Shell execution via execa |

### Additional Exports

```typescript
// Persistence
import { createPersistence, sqliteDriver, memoryDriver } from "@agentxjs/node-platform/persistence";

// Network
import { WebSocketServer, WebSocketConnection } from "@agentxjs/node-platform/network";

// Message Queue
import { SqliteMessageQueue, OffsetGenerator } from "@agentxjs/node-platform/mq";

// Bash
import { NodeBashProvider } from "@agentxjs/node-platform";

// Logger
import { FileLoggerFactory } from "@agentxjs/node-platform";
```

## Configuration

### NodePlatformOptions

```typescript
interface NodePlatformOptions {
  dataPath?: string;     // default: "./data"
  logDir?: string;       // enables file logging if set
  logLevel?: LogLevel;   // default: "debug" (file) / "info" (console)
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `dataPath` | `string` | `"./data"` | Base directory for SQLite database (`<dataPath>/agentx.db`) |
| `logDir` | `string` | -- | Log file directory. Enables file logging when set. |
| `logLevel` | `LogLevel` | `"debug"` (file) / `"info"` (console) | `"debug"` \| `"info"` \| `"warn"` \| `"error"` \| `"silent"` |

### Persistence Drivers

```typescript
// SQLite (production)
const persistence = await createPersistence(sqliteDriver({ path: "./data/agentx.db" }));

// In-memory (testing)
const persistence = await createPersistence(memoryDriver());
```

### File Logging

```typescript
import { FileLoggerFactory } from "@agentxjs/node-platform";
import { setLoggerFactory } from "commonxjs/logger";

setLoggerFactory(new FileLoggerFactory({
  logDir: ".agentx/logs",
  level: "info",
  filename: "app.log",   // default
}));
```

When `logDir` is passed to `createNodePlatform`, file logging is configured automatically.

### Sub-path Exports

| Import path | Contents |
|---|---|
| `@agentxjs/node-platform` | Main entry (everything) |
| `@agentxjs/node-platform/persistence` | `createPersistence`, `sqliteDriver`, `memoryDriver` |
| `@agentxjs/node-platform/mq` | `SqliteMessageQueue`, `OffsetGenerator` |
| `@agentxjs/node-platform/network` | `WebSocketServer`, `WebSocketConnection` |
