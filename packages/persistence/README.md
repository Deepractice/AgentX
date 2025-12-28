# @agentxjs/persistence

> Storage layer for AgentX with pluggable drivers

## Overview

`@agentxjs/persistence` provides the persistence layer for AgentX agents, including:

- **Image Repository** - Store and retrieve agent snapshots
- **Container Repository** - Manage container metadata
- **Session Repository** - Persist conversation history

**Key Features:**

- **Subpath Exports** - Import only the driver you need (tree-shaking friendly)
- **Multiple Backends** - SQLite, Redis, MongoDB, MySQL, PostgreSQL
- **Zero Config Default** - Memory driver works out of the box
- **Bun Optimized** - Uses `bun:sqlite` for SQLite driver

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
| SQLite     | `@agentxjs/persistence/sqlite`     | `db0`             |
| Redis      | `@agentxjs/persistence/redis`      | `ioredis`         |
| MongoDB    | `@agentxjs/persistence/mongodb`    | `mongodb`         |
| MySQL      | `@agentxjs/persistence/mysql`      | `mysql2`          |
| PostgreSQL | `@agentxjs/persistence/postgresql` | `pg`              |

## Driver Options

### SQLite

```typescript
sqliteDriver({
  path: "./data.db", // Database file path
});
```

### Redis

```typescript
redisDriver({
  url: "redis://localhost:6379", // Redis connection URL
});
```

### MongoDB

```typescript
mongodbDriver({
  connectionString: "mongodb://localhost:27017", // MongoDB connection string
  databaseName: "agentx", // Database name (optional)
  collectionName: "storage", // Collection name (optional)
});
```

### MySQL

```typescript
mysqlDriver({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "password",
  database: "agentx",
});
```

### PostgreSQL

```typescript
postgresqlDriver({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "agentx",
});
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

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                     Persistence                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐  ┌─────────────────────────────────┐ │
│   │  Repositories   │  │         Storage (unstorage)     │ │
│   │                 │  │                                 │ │
│   │  ImageRepo      │◄─┼─ memoryDriver()                 │ │
│   │  ContainerRepo  │  │  sqliteDriver({ path })         │ │
│   │  SessionRepo    │  │  redisDriver({ url })           │ │
│   │                 │  │  mongodbDriver({ ... })         │ │
│   └─────────────────┘  │  mysqlDriver({ ... })           │ │
│                        │  postgresqlDriver({ ... })      │ │
│                        └─────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Why Subpath Exports?

Each driver is a separate entry point to enable tree-shaking:

```typescript
// Only bundles memory driver (no external deps)
import { memoryDriver } from "@agentxjs/persistence";

// Only bundles SQLite driver (requires db0)
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

// Driver dependencies are NOT bundled if not imported
```

This is critical for binary distribution - portagent only imports `sqliteDriver`, so Redis/MySQL/PostgreSQL dependencies are never bundled.

## Package Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./sqlite": "./dist/drivers/sqlite.js",
    "./redis": "./dist/drivers/redis.js",
    "./mongodb": "./dist/drivers/mongodb.js",
    "./mysql": "./dist/drivers/mysql.js",
    "./postgresql": "./dist/drivers/postgresql.js"
  }
}
```

## Related Packages

- **[@agentxjs/runtime](../runtime)** - Runtime that uses persistence
- **[agentxjs](../agentx)** - High-level unified API

## License

MIT
