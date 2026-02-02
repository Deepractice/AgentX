# @agentxjs/persistence

> Storage layer for AgentX with pluggable drivers

## Overview

`@agentxjs/persistence` provides the persistence layer for AgentX agents:

- **ImageRepository** - Store and retrieve agent images (snapshots)
- **ContainerRepository** - Manage container metadata
- **SessionRepository** - Persist conversation sessions and messages

**Key Features:**

- **Subpath Exports** - Import only the driver you need (tree-shaking friendly)
- **Multiple Backends** - Memory, Filesystem, SQLite, Redis, MongoDB, MySQL, PostgreSQL
- **Zero Config Default** - Memory driver works out of the box
- **Cross-Runtime** - SQLite driver works on both Bun and Node.js 22+

## Installation

```bash
bun add @agentxjs/persistence
```

## Quick Start

### Memory Driver (Default)

```typescript
import { createPersistence, memoryDriver } from "@agentxjs/persistence";

const persistence = await createPersistence(memoryDriver());
```

### SQLite Driver

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

const persistence = await createPersistence(sqliteDriver({ path: "./data/agentx.db" }));
```

### Redis Driver

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";

const persistence = await createPersistence(redisDriver({ url: "redis://localhost:6379" }));
```

## Available Drivers

| Driver     | Import                             | Peer Dependencies |
| ---------- | ---------------------------------- | ----------------- |
| Memory     | `@agentxjs/persistence`            | None              |
| Filesystem | `@agentxjs/persistence/fs`         | None              |
| SQLite     | `@agentxjs/persistence/sqlite`     | None (built-in)   |
| Redis      | `@agentxjs/persistence/redis`      | `ioredis`         |
| MongoDB    | `@agentxjs/persistence/mongodb`    | `mongodb`         |
| MySQL      | `@agentxjs/persistence/mysql`      | `db0`, `mysql2`   |
| PostgreSQL | `@agentxjs/persistence/postgresql` | `db0`, `pg`       |

## Driver Configuration

### SQLite

Uses `@agentxjs/common/sqlite` with automatic runtime detection:

- **Bun**: uses `bun:sqlite` (built-in)
- **Node.js 22+**: uses `node:sqlite` (built-in)

```typescript
sqliteDriver({ path: "./data.db" });
```

### Filesystem

Stores data as JSON files in a directory:

```typescript
import { fsDriver } from "@agentxjs/persistence/fs";

fsDriver({ base: "./data" });
```

### Redis

```typescript
redisDriver({
  url: "redis://localhost:6379",
  base: "agentx", // Key prefix (default: "agentx")
});
```

### MongoDB

```typescript
mongodbDriver({
  connectionString: "mongodb://localhost:27017",
  databaseName: "agentx", // default: "agentx"
  collectionName: "storage", // default: "storage"
});
```

### MySQL

```typescript
mysqlDriver({
  uri: "mysql://user:pass@localhost:3306/agentx",
});
```

### PostgreSQL

```typescript
postgresqlDriver({
  connectionString: "postgres://user:pass@localhost:5432/agentx",
});
```

## Repository Interfaces

### ImageRepository

```typescript
// Save an image
await persistence.images.saveImage({
  imageId: "img_abc123",
  containerId: "container-1",
  sessionId: "session-1",
  name: "My Assistant",
  systemPrompt: "You are helpful.",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Find images
const image = await persistence.images.findImageById("img_abc123");
const all = await persistence.images.findAllImages();
const byName = await persistence.images.findImagesByName("My Assistant");
const byContainer = await persistence.images.findImagesByContainerId("container-1");

// Update and delete
await persistence.images.updateMetadata("img_abc123", { key: "value" });
await persistence.images.deleteImage("img_abc123");
```

### SessionRepository

```typescript
// Save a session
await persistence.sessions.saveSession({
  sessionId: "session-1",
  imageId: "img_abc123",
  containerId: "container-1",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Find sessions
const session = await persistence.sessions.findSessionById("session-1");
const byImage = await persistence.sessions.findSessionByImageId("img_abc123");
const byContainer = await persistence.sessions.findSessionsByContainerId("container-1");

// Message operations
await persistence.sessions.addMessage("session-1", {
  id: "msg-1",
  subtype: "user",
  content: "Hello!",
  timestamp: Date.now(),
});
const messages = await persistence.sessions.getMessages("session-1");
await persistence.sessions.clearMessages("session-1");
```

### ContainerRepository

```typescript
// Save a container
await persistence.containers.saveContainer({
  containerId: "container-1",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Find containers
const container = await persistence.containers.findContainerById("container-1");
const all = await persistence.containers.findAllContainers();
const exists = await persistence.containers.containerExists("container-1");

// Delete container
await persistence.containers.deleteContainer("container-1");
```

## Custom Driver

Implement the `PersistenceDriver` interface:

```typescript
import { createPersistence, type PersistenceDriver } from "@agentxjs/persistence";
import { createStorage, type Storage } from "unstorage";

const customDriver: PersistenceDriver = {
  async createStorage(): Promise<Storage> {
    return createStorage({
      driver: yourCustomUnstorageDriver(),
    });
  },
};

const persistence = await createPersistence(customDriver);
```

## Why Subpath Exports?

Each driver is a separate entry point to enable tree-shaking:

```typescript
// Only bundles memory driver (no external deps)
import { memoryDriver } from "@agentxjs/persistence";

// Only bundles SQLite driver
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

// Redis/MongoDB/MySQL/PostgreSQL are NOT bundled unless imported
```

This is important for binary distribution - only imported drivers are bundled.

## Documentation

For detailed documentation, see:

- [Persistence Guide](../../docs/guides/persistence.md)

## Related Packages

- [@agentxjs/runtime](../runtime) - Runtime that uses persistence
- [agentxjs](../agentx) - Unified API entry point

## License

MIT
