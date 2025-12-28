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
│   ├── types/            # @agentxjs/types - Type definitions (zero deps)
│   ├── common/           # @agentxjs/common - Logger facade
│   ├── persistence/      # @agentxjs/persistence - Storage layer (SQLite, Redis, etc.)
│   ├── network/          # @agentxjs/network - WebSocket server
│   ├── agent/            # @agentxjs/agent - Agent lifecycle and event management
│   ├── agentx/           # agentxjs - Platform API (unified entry point)
│   ├── runtime/          # @agentxjs/runtime - Claude driver, SystemBus
│   └── ui/               # @agentxjs/ui - React components (pure UI, no server deps)
└── dev/
    ├── server/           # Shared dev server (WebSocket, Agent runtime)
    └── storybook/        # @agentx/dev-storybook - UI component development
        ├── .storybook/   # Storybook configuration
        └── stories/      # Component stories
```

**Package Dependency**: `types → common → persistence → agent → agentx → runtime → ui`

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
