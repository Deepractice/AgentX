# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deepractice Agent (AgentX)** - Event-driven AI Agent framework with cross-platform support. TypeScript monorepo providing Node.js and browser-based AI agent capabilities powered by Claude.

## Repository Structure

```text
/Agent
├── apps/
│   └── portagent/        # Web UI with auth (Hono + Vite + React)
└── packages/
    ├── types/            # @agentxjs/types - Type definitions (zero deps)
    ├── common/           # @agentxjs/common - Logger facade
    ├── agent/            # @agentxjs/agent - Agent lifecycle and event management
    ├── agentx/           # agentxjs - Platform API (unified entry point)
    ├── runtime/          # @agentxjs/runtime - Claude driver, SQLite, SystemBus
    └── ui/               # @agentxjs/ui - React components (Storybook)
```

**Package Dependency**: `types → common → agent → agentx → runtime → ui`

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start development (portagent app)
pnpm build            # Build all packages
pnpm typecheck        # Type checking
pnpm lint             # Lint code
pnpm test             # Run tests
pnpm clean            # Clean artifacts

# Single package commands
pnpm --filter @agentxjs/agent test           # Run tests for one package
pnpm --filter @agentxjs/agent test:watch     # Watch mode
pnpm --filter @agentxjs/ui storybook         # Start Storybook (port 6006)
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
