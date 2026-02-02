# @agentxjs/common

Common utilities for the AgentX platform. Provides shared infrastructure including logging, SQLite database abstraction, path utilities, and ID generation.

## Overview

`@agentxjs/common` is an internal package providing essential utilities used throughout AgentX. Key design principles:

- **Internal Use**: Designed for AgentX internal packages
- **Lazy Initialization**: Safe to use at module level before configuration
- **Cross-Runtime**: Works in both Bun and Node.js environments
- **Zero Dependencies**: No external dependencies (except `@agentxjs/types`)

## Installation

```bash
bun add @agentxjs/common
```

> **Note**: This package is typically installed transitively as a dependency of other AgentX packages.

## Modules

| Module | Import Path               | Purpose                                          |
| ------ | ------------------------- | ------------------------------------------------ |
| Logger | `@agentxjs/common`        | Lazy-initialized logging with pluggable backends |
| SQLite | `@agentxjs/common/sqlite` | Cross-runtime SQLite database abstraction        |
| Path   | `@agentxjs/common/path`   | Cross-runtime path utilities                     |
| ID     | `@agentxjs/common`        | Unique ID generation utilities                   |

---

## Logger

Lazy-initialized logging with pluggable backends.

```typescript
import { createLogger } from "@agentxjs/common";

// Safe at module level (before Runtime configured)
const logger = createLogger("engine/AgentEngine");

// Log messages with context
logger.debug("Processing event", { eventType: "text_delta" });
logger.info("Agent initialized", { agentId: "agent_123" });
logger.warn("Connection retry", { attempt: 3 });
logger.error("Failed to process", { messageId: "msg_456" });
```

### Custom Logger Factory

```typescript
import { setLoggerFactory, LoggerFactoryImpl } from "@agentxjs/common";

// Configure the default factory
setLoggerFactory(
  new LoggerFactoryImpl({
    level: "debug",
    enableTimestamp: true,
  })
);
```

---

## SQLite

Cross-runtime SQLite abstraction with automatic runtime detection.

| Runtime     | Implementation           |
| ----------- | ------------------------ |
| Bun         | `bun:sqlite` (built-in)  |
| Node.js 22+ | `node:sqlite` (built-in) |

```typescript
import { openDatabase } from "@agentxjs/common/sqlite";

// Open database (auto-creates parent directories)
const db = openDatabase("./data/app.db");

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

// Insert data
const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
const result = stmt.run("Alice");
console.log("Inserted ID:", result.lastInsertRowid);

// Query data
const users = db.prepare("SELECT * FROM users").all();
console.log(users); // [{ id: 1, name: "Alice" }]

// In-memory database for testing
const memDb = openDatabase(":memory:");

// Close when done
db.close();
```

---

## Path Utilities

Cross-runtime path helpers for ESM modules.

```typescript
import {
  getModuleDir,
  getPackageRoot,
  getMonorepoRoot,
  resolveFromRoot,
  resolveFromPackage,
} from "@agentxjs/common/path";

// Current module directory (cross-runtime __dirname)
const __dirname = getModuleDir(import.meta);

// Package root (where package.json is)
const pkgRoot = getPackageRoot(import.meta);

// Monorepo root
const root = getMonorepoRoot(import.meta);

// Resolve from monorepo root
const dataDir = resolveFromRoot(import.meta, "data");

// Resolve from package root
const testsDir = resolveFromPackage(import.meta, "tests", "fixtures");
```

> **Why not `import.meta.dir`?** Bun provides `import.meta.dir`, but Node.js does not. Use these utilities for cross-runtime compatibility.

---

## ID Generation

Consistent ID generation patterns.

```typescript
import { generateId, generateRequestId } from "@agentxjs/common";

// Generate request ID for command correlation
const requestId = generateRequestId();
// => "req_1704067200000_a1b2c3"

// Generate ID with custom prefix
const msgId = generateId("msg");
// => "msg_1704067200000_a1b2c3"

const agentId = generateId("agent");
// => "agent_1704067200000_x7y8z9"
```

---

## API Summary

### Main Exports (`@agentxjs/common`)

| Export              | Type     | Description                   |
| ------------------- | -------- | ----------------------------- |
| `createLogger`      | Function | Create a logger instance      |
| `setLoggerFactory`  | Function | Set external logger factory   |
| `ConsoleLogger`     | Class    | Default console-based logger  |
| `LoggerFactoryImpl` | Class    | Logger factory implementation |
| `generateId`        | Function | Generate ID with prefix       |
| `generateRequestId` | Function | Generate request ID           |

### SQLite Exports (`@agentxjs/common/sqlite`)

| Export         | Type     | Description            |
| -------------- | -------- | ---------------------- |
| `openDatabase` | Function | Open a SQLite database |

### Path Exports (`@agentxjs/common/path`)

| Export               | Type     | Description                     |
| -------------------- | -------- | ------------------------------- |
| `getModuleDir`       | Function | Get current module directory    |
| `getPackageRoot`     | Function | Get package root directory      |
| `getMonorepoRoot`    | Function | Get monorepo root directory     |
| `resolveFromRoot`    | Function | Resolve path from monorepo root |
| `resolveFromPackage` | Function | Resolve path from package root  |

---

## Full Documentation

For detailed API documentation and advanced usage, see the [full documentation](../../docs/packages/common.md).

## Related Packages

- [@agentxjs/types](../types) - Type definitions
- [@agentxjs/queue](../queue) - Event queue (uses SQLite)
- [@agentxjs/persistence](../persistence) - Storage layer (uses SQLite)
- [@agentxjs/runtime](../runtime) - Runtime implementation

## License

MIT
