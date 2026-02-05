# Persistence and Storage Guide

This guide covers how to configure and use persistence in AgentX for storing conversations, sessions, images, and events.

## Overview

AgentX uses a multi-layer persistence architecture:

1. **Persistence Layer** - Stores entities (containers, images, sessions, messages)
2. **Event Queue** - Stores events for reliable delivery and reconnection recovery

Both layers support multiple storage backends through a unified driver interface.

## Default Behavior

By default, AgentX uses **SQLite** for persistence:

```typescript
import { createAgentX } from "agentxjs";

// Default: SQLite at ~/.agentx/data/agentx.db
const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
});
```

Data is stored in:

- `~/.agentx/data/agentx.db` - Entity storage (containers, images, sessions, messages)
- `~/.agentx/data/queue.db` - Event queue (for reconnection recovery)

## Custom Base Directory

Change the storage location with `agentxDir`:

```typescript
const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
  agentxDir: "/var/lib/agentx", // Custom base directory
});

// Data stored in:
// - /var/lib/agentx/data/agentx.db
// - /var/lib/agentx/data/queue.db
```

Directory structure:

```
{agentxDir}/
├── data/
│   ├── agentx.db      # Entity storage
│   └── queue.db       # Event queue
├── containers/        # Agent workdirs
└── logs/             # Log files (if configured)
```

---

## Storage Drivers

AgentX supports multiple storage backends through the `@agentxjs/persistence` package.

### Memory Driver (Development/Testing)

In-memory storage - data is lost when the process exits:

```typescript
import { createPersistence, memoryDriver } from "@agentxjs/persistence";

const persistence = await createPersistence(memoryDriver());
```

**Use cases:**

- Unit testing
- Development/prototyping
- Stateless applications

### SQLite Driver (Default)

Local file-based storage with automatic runtime detection:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

const persistence = await createPersistence(sqliteDriver({ path: "./data/agentx.db" }));
```

**Features:**

- Bun: Uses `bun:sqlite` (built-in, fast)
- Node.js 22+: Uses `node:sqlite` (built-in)
- Auto-creates parent directories
- Zero external dependencies

**Best for:**

- Single-server deployments
- Desktop applications
- Edge/embedded environments

### Filesystem Driver

JSON files stored in a directory:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { fsDriver } from "@agentxjs/persistence/fs";

const persistence = await createPersistence(fsDriver({ base: "./data" }));
```

**Features:**

- Human-readable storage
- Easy to inspect and debug
- No database setup required

**Best for:**

- Debugging and inspection
- Simple deployments
- Version-controlled configurations

### Redis Driver

Distributed caching with persistence:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";

const persistence = await createPersistence(
  redisDriver({
    url: "redis://localhost:6379",
    base: "agentx", // Key prefix (default: "agentx")
  })
);
```

**Requirements:**

```bash
bun add ioredis
```

**Best for:**

- Distributed systems
- High-performance caching
- Horizontal scaling

### MongoDB Driver

Document database storage:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { mongodbDriver } from "@agentxjs/persistence/mongodb";

const persistence = await createPersistence(
  mongodbDriver({
    connectionString: "mongodb://localhost:27017",
    databaseName: "agentx", // default: "agentx"
    collectionName: "storage", // default: "storage"
  })
);
```

**Requirements:**

```bash
bun add mongodb
```

**Best for:**

- Flexible schema requirements
- Large-scale deployments
- Document-oriented data

### PostgreSQL Driver

Relational database storage:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { postgresqlDriver } from "@agentxjs/persistence/postgresql";

const persistence = await createPersistence(
  postgresqlDriver({
    connectionString: "postgres://user:pass@localhost:5432/agentx",
  })
);
```

**Requirements:**

```bash
bun add db0 pg
```

**Best for:**

- Enterprise deployments
- ACID compliance requirements
- Complex queries and reporting

### MySQL Driver

MySQL/MariaDB storage:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { mysqlDriver } from "@agentxjs/persistence/mysql";

const persistence = await createPersistence(
  mysqlDriver({
    uri: "mysql://user:pass@localhost:3306/agentx",
  })
);
```

**Requirements:**

```bash
bun add db0 mysql2
```

**Best for:**

- MySQL-based infrastructure
- Legacy system integration

---

## What Gets Persisted

AgentX persists the following entities:

### Containers

Isolation boundaries that group agents:

```typescript
interface ContainerRecord {
  containerId: string; // Unique identifier
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number; // Unix timestamp (ms)
  config?: ContainerConfig; // Optional configuration
}
```

### Images

Conversation snapshots (like Docker images):

```typescript
interface ImageRecord {
  imageId: string; // Unique identifier (img_xxx)
  containerId: string; // Parent container
  sessionId: string; // Associated session
  name: string; // Display name
  description?: string; // Optional description
  systemPrompt?: string; // Agent behavior
  parentImageId?: string; // For fork/branch feature
  mcpServers?: Record<string, McpServerConfig>; // Tool servers
  metadata?: ImageMetadata; // Provider-specific data
  createdAt: number;
  updatedAt: number;
}
```

### Sessions

Conversation history containers:

```typescript
interface SessionRecord {
  sessionId: string; // Unique identifier
  imageId: string; // Parent image
  containerId: string; // Parent container
  createdAt: number;
  updatedAt: number;
}
```

### Messages

Individual conversation messages (stored per session):

```typescript
interface Message {
  id: string;
  subtype: "user" | "assistant" | "tool_call" | "tool_result";
  content: string | ToolCall[];
  timestamp: number;
}
```

---

## Event Queue

The event queue provides reliable event delivery with reconnection recovery.

### Configuration

```typescript
import { createQueue } from "@agentxjs/queue";

const queue = createQueue({
  path: "./data/queue.db", // SQLite database
  retentionMs: 86400000, // Message retention: 24 hours (default)
  cleanupIntervalMs: 300000, // Cleanup interval: 5 minutes (default)
});
```

### In-Memory Queue (Testing)

```typescript
const queue = createQueue({
  path: ":memory:", // In-memory database
});
```

### How It Works

1. **Publish**: Events are persisted to SQLite and broadcast to subscribers
2. **Subscribe**: Receive real-time events
3. **ACK**: Confirm processing to update consumer cursor
4. **Recover**: Fetch missed events after reconnection

```typescript
// Subscribe to session events
const unsubscribe = queue.subscribe("session-123", (entry) => {
  console.log("Event:", entry.event);
  console.log("Cursor:", entry.cursor);
});

// Publish an event
const cursor = queue.publish("session-123", {
  type: "text_delta",
  data: { text: "Hello" },
});

// Acknowledge after processing
await queue.ack("connection-1", "session-123", cursor);

// Recover missed events (after reconnection)
const lastCursor = await queue.getCursor("connection-1", "session-123");
const missed = await queue.recover("session-123", lastCursor);
for (const entry of missed) {
  console.log("Missed event:", entry.event);
}

// Cleanup
unsubscribe();
await queue.close();
```

---

## Using Persistence Directly

For advanced use cases, access the persistence layer directly:

### Create Persistence Instance

```typescript
import { createPersistence, memoryDriver } from "@agentxjs/persistence";
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

// Choose your driver
const persistence = await createPersistence(sqliteDriver({ path: "./data/agentx.db" }));
```

### Image Repository

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
const allImages = await persistence.images.findAllImages();
const byName = await persistence.images.findImagesByName("My Assistant");
const byContainer = await persistence.images.findImagesByContainerId("container-1");

// Update metadata
await persistence.images.updateMetadata("img_abc123", {
  driverSessionId: "sdk-session-xxx",
});

// Delete image
await persistence.images.deleteImage("img_abc123");
```

### Session Repository

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

// Delete session
await persistence.sessions.deleteSession("session-1");
```

### Container Repository

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

---

## Data Migration

### Export Data

Export data from one driver to JSON:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { sqliteDriver } from "@agentxjs/persistence/sqlite";
import { writeFileSync } from "node:fs";

async function exportData(sourcePath: string, outputPath: string) {
  const persistence = await createPersistence(sqliteDriver({ path: sourcePath }));

  const data = {
    containers: await persistence.containers.findAllContainers(),
    images: await persistence.images.findAllImages(),
    sessions: await persistence.sessions.findAllSessions(),
    messages: {} as Record<string, unknown[]>,
  };

  // Export messages for each session
  for (const session of data.sessions) {
    data.messages[session.sessionId] = await persistence.sessions.getMessages(session.sessionId);
  }

  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Exported to ${outputPath}`);
}

exportData("./data/agentx.db", "./backup.json");
```

### Import Data

Import data into a new driver:

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";
import { readFileSync } from "node:fs";

async function importData(inputPath: string, redisUrl: string) {
  const persistence = await createPersistence(redisDriver({ url: redisUrl }));

  const data = JSON.parse(readFileSync(inputPath, "utf-8"));

  // Import containers
  for (const container of data.containers) {
    await persistence.containers.saveContainer(container);
  }

  // Import images
  for (const image of data.images) {
    await persistence.images.saveImage(image);
  }

  // Import sessions and messages
  for (const session of data.sessions) {
    await persistence.sessions.saveSession(session);

    const messages = data.messages[session.sessionId] || [];
    for (const message of messages) {
      await persistence.sessions.addMessage(session.sessionId, message);
    }
  }

  console.log("Import complete");
}

importData("./backup.json", "redis://localhost:6379");
```

---

## Backup Strategies

### SQLite Backup

SQLite databases can be backed up by copying the file:

```bash
# Simple file copy (while app is stopped)
cp ~/.agentx/data/agentx.db ~/backups/agentx-$(date +%Y%m%d).db

# Using SQLite backup API (while app is running)
sqlite3 ~/.agentx/data/agentx.db ".backup ~/backups/agentx-$(date +%Y%m%d).db"
```

### Automated Backup Script

```typescript
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function backupDatabase(dbPath: string, backupDir: string) {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `agentx-${timestamp}.db`);

  copyFileSync(dbPath, backupPath);
  console.log(`Backup created: ${backupPath}`);

  return backupPath;
}

// Usage
backupDatabase("/Users/username/.agentx/data/agentx.db", "/Users/username/backups");
```

### Retention Policy

Clean up old backups:

```typescript
import { readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

function cleanOldBackups(backupDir: string, retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const files = readdirSync(backupDir).filter((f) => f.startsWith("agentx-") && f.endsWith(".db"));

  for (const file of files) {
    const filePath = join(backupDir, file);
    const stat = statSync(filePath);

    if (stat.mtimeMs < cutoff) {
      unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  }
}

// Keep backups for 30 days
cleanOldBackups("/Users/username/backups", 30);
```

---

## Production Recommendations

### SQLite (Single Server)

```typescript
const agentx = await createAgentX({
  llm: { apiKey: process.env.ANTHROPIC_API_KEY },
  agentxDir: "/var/lib/agentx",
});
```

- Use dedicated SSD storage
- Enable WAL mode for better concurrency
- Schedule regular backups

### Redis (Distributed)

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";

const persistence = await createPersistence(
  redisDriver({
    url: process.env.REDIS_URL,
    base: "agentx",
  })
);
```

- Use Redis Cluster for high availability
- Configure persistence (RDB + AOF)
- Set appropriate memory limits

### PostgreSQL (Enterprise)

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { postgresqlDriver } from "@agentxjs/persistence/postgresql";

const persistence = await createPersistence(
  postgresqlDriver({
    connectionString: process.env.DATABASE_URL,
  })
);
```

- Use connection pooling
- Enable SSL for connections
- Regular vacuum and analyze
- Set up replication for HA

---

## Troubleshooting

### Database Locked

If you see "database is locked" errors with SQLite:

1. Ensure only one process accesses the database
2. Consider using Redis for multi-process scenarios
3. Check for zombie processes holding locks

### Connection Pool Exhausted

For PostgreSQL/MySQL:

1. Increase pool size in connection string
2. Ensure connections are properly closed
3. Check for connection leaks

### Data Corruption

If you suspect data corruption:

1. Stop the application
2. Run integrity check: `sqlite3 agentx.db "PRAGMA integrity_check;"`
3. Restore from backup if needed

---

## Next Steps

- **[Lifecycle Management](../concepts/lifecycle.md)** - Container/Agent/Session lifecycle
- **[Event System](../concepts/event-system.md)** - Understanding events
- **[Session Management](./sessions.md)** - Working with sessions
