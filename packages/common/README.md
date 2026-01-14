# @agentxjs/common

> Shared infrastructure for AgentX internal packages

## Overview

`@agentxjs/common` provides shared utilities used by AgentX internal packages (`@agentxjs/agent`, `@agentxjs/runtime`, etc.). This is an internal package - application code should not depend on it directly.

**Modules:**

| Module | Import                    | Description                                      |
| ------ | ------------------------- | ------------------------------------------------ |
| Logger | `@agentxjs/common`        | Lazy-initialized logging with pluggable backends |
| SQLite | `@agentxjs/common/sqlite` | Unified SQLite abstraction for Bun/Node.js       |

## Installation

```bash
bun add @agentxjs/common
```

> **Note**: This package is typically installed transitively as a dependency of other AgentX packages.

---

## Logger

### Quick Start

```typescript
import { createLogger } from "@agentxjs/common";

// Safe to use at module level (before Runtime configured)
const logger = createLogger("agent/AgentEngine");

// Later, at runtime
logger.info("Agent created", { agentId: "agent_123" });
logger.debug("Processing message", { messageId: "msg_456" });
logger.error("Failed to process", { error: err.message });
```

### Features

#### 1. Lazy Initialization

Loggers can be created at module level without errors:

```typescript
// At module level (before Runtime exists)
const logger = createLogger("engine/MealyMachine");

// No-op until LoggerFactory is configured
logger.info("This is buffered");

// Later, when Runtime initializes
setLoggerFactory(new LoggerFactoryImpl());

// Now logs are emitted
logger.info("This is logged");
```

#### 2. Structured Logging

All loggers support structured context:

```typescript
logger.info("User logged in", {
  userId: "user_123",
  timestamp: Date.now(),
  ip: "192.168.1.1",
});

// Output (with ConsoleLogger):
// [INFO] agent/UserService: User logged in {"userId":"user_123",...}
```

#### 3. Log Levels

Supported log levels (in order of severity):

```typescript
logger.debug("Detailed debug info"); // Development only
logger.info("Normal operation"); // General info
logger.warn("Warning condition"); // Potential issues
logger.error("Error occurred"); // Errors
```

### API

#### `createLogger(category: string): Logger`

Creates a new logger instance.

```typescript
const logger = createLogger("agent/MyAgent");
```

#### `setLoggerFactory(factory: LoggerFactory): void`

Sets the global logger factory (called by Runtime).

```typescript
import { LoggerFactoryImpl, setLoggerFactory } from "@agentxjs/common";

setLoggerFactory(
  new LoggerFactoryImpl({
    level: "debug",
    enableTimestamp: true,
  })
);
```

---

## SQLite

Unified SQLite abstraction that auto-detects runtime:

- **Bun** → uses `bun:sqlite` (built-in)
- **Node.js 22+** → uses `node:sqlite` (built-in)

### Quick Start

```typescript
import { openDatabase } from "@agentxjs/common/sqlite";

const db = openDatabase("./data/app.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

// Insert data
db.prepare("INSERT INTO users (name) VALUES (?)").run("Alice");

// Query data
const users = db.prepare("SELECT * FROM users").all();
console.log(users); // [{ id: 1, name: "Alice" }]

// Close when done
db.close();
```

### API

#### `openDatabase(path: string): Database`

Opens a SQLite database.

```typescript
import { openDatabase } from "@agentxjs/common/sqlite";

// File-based database
const db = openDatabase("./data/app.db");

// In-memory database (for testing)
const memDb = openDatabase(":memory:");
```

### Database Interface

```typescript
interface Database {
  /** Execute raw SQL (no return value) */
  exec(sql: string): void;

  /** Prepare a statement */
  prepare(sql: string): Statement;

  /** Close the database */
  close(): void;
}

interface Statement {
  /** Execute with params, return changes */
  run(...params: unknown[]): RunResult;

  /** Get single row */
  get(...params: unknown[]): unknown;

  /** Get all rows */
  all(...params: unknown[]): unknown[];
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}
```

### Example: Key-Value Store

```typescript
import { openDatabase } from "@agentxjs/common/sqlite";

const db = openDatabase("./kv.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

function set(key: string, value: unknown) {
  const json = JSON.stringify(value);
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(key, json);
}

function get<T>(key: string): T | null {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? JSON.parse(row.value) : null;
}

set("user:1", { name: "Alice", age: 30 });
console.log(get("user:1")); // { name: "Alice", age: 30 }
```

---

## Path Utilities

Cross-runtime path helpers that work in both Bun and Node.js.

### Quick Start

```typescript
import {
  getModuleDir,
  getPackageRoot,
  getMonorepoRoot,
  resolveFromRoot,
  resolveFromPackage,
} from "@agentxjs/common/path";

// Current module directory
const __dirname = getModuleDir(import.meta);
// e.g., /Users/sean/AgentX/packages/queue/src

// Package root (where package.json is)
const pkgRoot = getPackageRoot(import.meta);
// e.g., /Users/sean/AgentX/packages/queue

// Monorepo root
const root = getMonorepoRoot(import.meta);
// e.g., /Users/sean/AgentX

// Resolve from monorepo root
const dataDir = resolveFromRoot(import.meta, "data", "logs");
// e.g., /Users/sean/AgentX/data/logs

// Resolve from package root
const testsDir = resolveFromPackage(import.meta, "tests", "fixtures");
// e.g., /Users/sean/AgentX/packages/queue/tests/fixtures
```

### API

#### `getModuleDir(meta: ImportMeta): string`

Get the directory of the current module.

```typescript
const __dirname = getModuleDir(import.meta);
```

**Compatibility:**

- Bun: uses `import.meta.dir`
- Node.js: converts `import.meta.url` to path

#### `getPackageRoot(meta: ImportMeta): string`

Get the package root directory (walks up to find `package.json`).

```typescript
const pkgRoot = getPackageRoot(import.meta);
```

#### `getMonorepoRoot(meta: ImportMeta): string`

Get the monorepo root directory (walks up to find lock files).

```typescript
const root = getMonorepoRoot(import.meta);
```

**Detects:**

- `pnpm-workspace.yaml` (pnpm monorepo)
- `bun.lock` (bun workspace)
- `package-lock.json` (npm workspace)
- `yarn.lock` (yarn workspace)

#### `resolveFromRoot(meta: ImportMeta, ...paths: string[]): string`

Resolve a path relative to the monorepo root.

```typescript
const configPath = resolveFromRoot(import.meta, "config", "settings.json");
```

#### `resolveFromPackage(meta: ImportMeta, ...paths: string[]): string`

Resolve a path relative to the package root.

```typescript
const testData = resolveFromPackage(import.meta, "tests", "fixtures", "data.json");
```

### Example: Test Fixtures

```typescript
import { resolveFromPackage } from "@agentxjs/common/path";
import { readFileSync } from "node:fs";

// Load test fixture from current package
const fixturePath = resolveFromPackage(import.meta, "tests", "fixtures", "sample.json");
const data = JSON.parse(readFileSync(fixturePath, "utf-8"));
```

---

## Built-in Implementations

### ConsoleLogger

Default console-based logger with formatting.

```typescript
import { ConsoleLogger } from "@agentxjs/common";

const logger = new ConsoleLogger("my-category", {
  level: "debug",
  enableTimestamp: true,
  enableColor: true,
});

logger.info("Hello", { foo: "bar" });
// Output: [INFO] my-category: Hello {"foo":"bar"}
```

**Options:**

```typescript
interface ConsoleLoggerOptions {
  level?: LogLevel; // Minimum log level (default: "info")
  enableTimestamp?: boolean; // Show timestamps (default: false)
  enableColor?: boolean; // Colorize output (default: true in TTY)
}
```

### LoggerFactoryImpl

Default factory that creates `ConsoleLogger` instances.

```typescript
import { LoggerFactoryImpl } from "@agentxjs/common";

const factory = new LoggerFactoryImpl({
  level: "info",
  enableTimestamp: false,
});

const logger = factory.createLogger("test");
```

---

## Package Dependencies

```text
@agentxjs/types     Type definitions
       ↑
@agentxjs/common    This package (logger + sqlite)
       ↑
@agentxjs/queue     Uses sqlite
       ↑
@agentxjs/persistence  Uses sqlite
       ↑
@agentxjs/runtime   Uses logger + provides factory
```

---

## Related Packages

- **[@agentxjs/types](../types)** - Type definitions
- **[@agentxjs/queue](../queue)** - Event queue (uses SQLite)
- **[@agentxjs/persistence](../persistence)** - Storage layer (uses SQLite)
- **[@agentxjs/runtime](../runtime)** - Runtime implementation

---

## License

MIT
