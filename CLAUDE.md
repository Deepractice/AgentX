# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deepractice Agent (AgentX)** - Event-driven AI Agent framework with cross-platform support. TypeScript monorepo providing Node.js and browser-based AI agent capabilities powered by Claude.

## Repository Structure

```text
/AgentX
├── apps/
│   └── portagent/        # Web UI with auth (Hono + Vite + React)
├── packages/
│   ├── core/             # @agentxjs/core - Interfaces and types (driver, runtime, platform, bash, agent, event, etc.)
│   ├── claude-driver/    # @agentxjs/claude-driver - Claude Code SDK driver
│   ├── mono-driver/      # @agentxjs/mono-driver - Vercel AI SDK driver (multi-provider, MCP support)
│   ├── node-platform/    # @agentxjs/node-platform - Node.js platform (SQLite, bash, network)
│   ├── devtools/         # @agentxjs/devtools - VCR recording/playback for BDD tests
│   ├── server/           # @agentxjs/server - WebSocket server for remote mode
│   └── agentx/           # agentxjs - Platform API (unified entry point)
├── bdd/                  # BDD tests (Cucumber)
└── dev/
    ├── server/           # Shared dev server (WebSocket, Agent runtime)
    └── storybook/        # @agentx/dev-storybook - UI component development
        ├── .storybook/   # Storybook configuration
        └── stories/      # Component stories
```

**Package Dependency**: `core → drivers/platform → devtools → server/agentx`

**Dev Tools Isolation**: All development tools (Storybook, dev server) are isolated in `dev/`, ensuring `packages/ui` remains frontend-only with zero server dependencies.

## Commands

```bash
bun install           # Install dependencies
bun build             # Build all packages
bun typecheck         # Type checking
bun lint              # Lint code
bun test              # Run tests
bun clean             # Clean artifacts

# Development (unified dev-manager)
bun dev               # Start portagent app (default)
bun dev portagent     # Start portagent app explicitly
bun dev server        # Start WebSocket dev server (port 5200)
bun dev storybook     # Start Storybook (port 6006)
bun dev storybook server  # Start Storybook + WebSocket server
bun dev all           # Start all dev tools (server + storybook)
bun dev --help        # Show all available services

# Single package commands
bun --filter @agentxjs/agent test            # Run tests for one package
bun --filter @agentxjs/agent test:watch      # Watch mode

# BDD tests
cd bdd && bun test                           # Run all BDD tests
cd bdd && bun test --tags @bug               # Run bug reproduction tests
```

## Bug-Driven Testing

When fixing bugs, follow the **Bug-First Testing** workflow:

1. **Reproduce in BDD**: Create a `.feature` file in `bdd/features/bugs/` to reproduce the bug
2. **Tag with @bug @wip**: Mark as work-in-progress bug test
3. **Run and verify failure**: Ensure the test fails as expected
4. **Fix the code**: Implement the fix
5. **Verify test passes**: Run the bug test to confirm fix
6. **Promote if valuable**: Move to appropriate feature directory (e.g., `reliability/`, `conversation/`)

```bash
# Bug reproduction workflow
cd bdd
bun test --tags "@bug and @wip"              # Run WIP bug tests only
bun test --tags @bug                         # Run all bug tests
```

**Directory structure**:

```text
bdd/features/
├── bugs/                 # Bug reproduction tests (@bug tag)
│   └── *.feature         # Individual bug scenarios
├── reliability/          # Reliability tests (reconnect, delivery)
├── conversation/         # Conversation flow tests
└── agentx/               # AgentX API tests
```

## Core Architecture

### 4-Layer Event System

1. **Stream Layer** - Real-time incremental events (text_delta, tool_call)
2. **State Layer** - State transitions (thinking, responding, executing)
3. **Message Layer** - Complete messages (user/assistant/tool)
4. **Turn Layer** - Analytics (cost, duration, tokens)

### Key Principles

**Mealy Machine Pattern**: `(state, input) → (state, outputs)`

- State is means, output is goal
- Pure functions, testable without mocks

**Stream-Only SSE**: Server forwards Stream events only, browser reassembles Message/State/Turn events via local AgentEngine.

**Docker-Style Lifecycle**: `Definition → Image → Agent → Session`

### Event Types

```typescript
// Stream (transmitted via SSE)
"message_start" | "text_delta" | "tool_call" | "tool_result" | "message_stop";

// Message (browser reassembles)
"user_message" | "assistant_message" | "tool_call_message" | "error_message";

// State (browser generates)
"conversation_start" | "conversation_thinking" | "tool_executing" | "conversation_end";
```

## Usage Example

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { runtime } from "@agentxjs/runtime";

const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

const agentx = createAgentX(runtime);
agentx.definitions.register(MyAgent);

const image = await agentx.images.getMetaImage("Assistant");
const session = await agentx.sessions.create(image.imageId, "user-1");
const agent = await session.resume();

agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log(e.data.content),
});

await agent.receive("Hello!");
```

### Remote Mode with Authentication and Context

When connecting to a remote AgentX server, you can provide authentication headers and business context:

```typescript
import { createAgentX } from "agentxjs";

// Simple static configuration
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: { Authorization: "Bearer sk-xxx" },
  context: { userId: "123", tenantId: "abc" },
});

// Dynamic configuration (evaluated on connect/request)
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
  context: () => ({
    userId: getCurrentUser().id,
    permissions: getUserPermissions(),
  }),
});

// Async dynamic configuration
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: async () => ({ Authorization: `Bearer ${await fetchToken()}` }),
  context: async () => ({
    userId: await getUserId(),
    sessionId: await getSessionId(),
  }),
});

// Context is automatically merged into all requests
// Request-level context takes precedence over global context
await agentx.request("message_send", {
  content: "Hello",
  // This context will be merged with global context
  context: { traceId: "trace-123" },
});
```

**Note**:

- **Headers**: In Node.js, sent during WebSocket handshake. In browsers, sent as first authentication message (WebSocket API limitation).
- **Context**: Automatically injected into all requests. Useful for passing userId, tenantId, permissions, etc.

## Coding Standards

**Language**: English for all code, comments, logs, error messages.

**Naming**:

- Classes: PascalCase with suffixes (`*Driver`, `*Manager`, `*Repository`)
- Interfaces: No `I` prefix (`Agent`, not `IAgent`)
- Events: snake_case (`text_delta`, `assistant_message`)
- Functions: camelCase with verbs (`createAgent`, `addMessage`)

**File Organization**: One type per file, feature-based directories, barrel exports.

**OOP Style**: Class-based architecture following Java conventions.

### Logging

Always use logger facade, never direct `console.*`:

```typescript
import { createLogger } from "@agentxjs/common";
const logger = createLogger("engine/AgentEngine");
logger.info("Agent created", { agentId });
```

Exceptions: Storybook stories, test files, build scripts.

### Common Utilities

Always prefer using utilities from `@agentxjs/common` instead of writing custom implementations:

#### SQLite (`@agentxjs/common/sqlite`)

**DO NOT** use `db0` or other SQLite libraries. Use our native SQLite abstraction:

```typescript
import { openDatabase } from "@agentxjs/common/sqlite";

const db = openDatabase("./data/app.db");
db.exec("CREATE TABLE IF NOT EXISTS ...");
db.prepare("INSERT INTO ...").run(params);
const rows = db.prepare("SELECT * FROM ...").all();
db.close();
```

**Features:**

- Auto-detects runtime (Bun → `bun:sqlite`, Node.js 22+ → `node:sqlite`)
- Auto-creates parent directories
- Zero external dependencies

#### Path Utilities (`@agentxjs/common/path`)

**DO NOT** use `import.meta.dir` directly (Node.js incompatible). Use path utilities:

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

// Package root (e.g., /AgentX/packages/queue)
const pkgRoot = getPackageRoot(import.meta);

// Monorepo root (e.g., /AgentX)
const root = getMonorepoRoot(import.meta);

// Resolve paths
const dataDir = resolveFromRoot(import.meta, "data");
const testFixtures = resolveFromPackage(import.meta, "tests", "fixtures");
```

**Use cases:**

- BDD/integration tests need to locate test data
- Build scripts need to find monorepo root
- Packages need portable path resolution

#### Queue (`@agentxjs/queue`)

Event queue with in-memory pub/sub (RxJS) and SQLite persistence:

```typescript
import { createQueue } from "@agentxjs/queue";

const queue = createQueue({ path: "./data/queue.db" });

// Publish events (broadcasts + persists async)
const cursor = queue.publish("session-123", event);

// Subscribe to real-time events
queue.subscribe("session-123", (entry) => {
  console.log(entry.event);
});

// ACK after processing (update consumer position)
await queue.ack(connectionId, "session-123", cursor);

// Recover missed events on reconnection
const lastCursor = await queue.getCursor(connectionId, "session-123");
const missed = await queue.recover("session-123", lastCursor);
```

**Key points:**

- In-memory = fast real-time delivery
- SQLite = persistence guarantee for recovery
- Decoupled from network protocol

#### Network (`@agentxjs/network`)

WebSocket with reliable message delivery:

```typescript
import { WebSocketServer } from "@agentxjs/network";

const server = new WebSocketServer();
await server.listen(5200);

server.onConnection((connection) => {
  // Reliable delivery with ACK
  connection.sendReliable(JSON.stringify(event), {
    onAck: () => {
      console.log("Client confirmed receipt");
      // Hook: persist data after ACK
    },
    timeout: 5000,
    onTimeout: () => console.log("Client did not ACK"),
  });
});
```

**Key points:**

- `sendReliable()` wraps message with `__msgId`
- Client auto-sends `__ack`
- Server triggers `onAck` callback
- Use for at-least-once delivery guarantees

## Environment Variables

```env
ANTHROPIC_API_KEY     # Claude API key (required)
ANTHROPIC_BASE_URL    # API endpoint
LOG_LEVEL             # debug/info/warn/error
PORT                  # Server port (default: 5200)
```

## Development Notes

### Portagent (Web App)

```bash
cd apps/portagent && pnpm dev
```

Environment (`.env.local`):

```env
LLM_PROVIDER_KEY=sk-ant-xxxxx
```

### SSE API Endpoints

| Method   | Path                        | Description        |
| -------- | --------------------------- | ------------------ |
| GET      | `/agents/:agentId/sse`      | Event stream       |
| POST     | `/agents/:agentId/messages` | Send message       |
| POST     | `/images/:imageId/run`      | Run agent          |
| GET/POST | `/sessions/*`               | Session management |

### Common Issues

**Build failures**: `pnpm clean && pnpm install && pnpm build`

**Browser not receiving Message events**: Check browser AgentEngine is initialized. Do NOT forward Message events from server (by design).

## Release Process

Create changeset file in `.changeset/`:

```yaml
---
"@agentxjs/package-name": patch
---
Description of changes
```

**Version Guidelines**:

- Use `patch` for bug fixes and internal improvements
- Use `minor` for new features and enhancements
- **DO NOT use `major`** - Breaking changes should be avoided. If absolutely necessary, discuss with team first.
