# @deepractice-ai/agentx-framework

**AgentX Framework** - Build composable AI agents with a simple, powerful API.

## 🌟 Highlights

- 🔗 **Agent Chaining** - Agents can be used as Drivers → unlimited composition!
- 🎯 **Simple Define API** - `defineDriver`, `defineReactor`, `defineAgent`
- 🚀 **Pre-configured Agents** - Ready-to-use `ClaudeAgent`, `WebSocketServerAgent`
- 🔌 **Cross-platform** - Node.js ↔ Browser via WebSocket
- 📦 **Type-safe** - Full TypeScript support
- 🎭 **Event-driven** - 4-layer reactor system (Stream, State, Message, Exchange)

## 🚀 Quick Start

### Installation

```bash
pnpm add @deepractice-ai/agentx-framework
```

### Simplest Usage - Pre-configured Agent

```typescript
import { ClaudeAgent } from "@deepractice-ai/agentx-framework/agents";

// 1. Create agent
const agent = ClaudeAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 2. Initialize
await agent.initialize();

// 3. Use it
await agent.send("Hello!");

// 4. Clean up
await agent.destroy();
```

## 🔥 Agent Chaining - The Game Changer

**Agents implement the Driver interface**, which means **Agents can be used as Drivers**!

### Example: WebSocket Server Agent

```typescript
import { ClaudeAgent } from "@deepractice-ai/agentx-framework/agents";
import { WebSocketReactor } from "@deepractice-ai/agentx-framework";
import { defineAgent } from "@deepractice-ai/agentx-framework";

// Agent 1: Base Claude Agent
const claudeAgent = ClaudeAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Agent 2: Wrap Claude Agent + add WebSocket forwarding
const wsAgent = defineAgent({
  name: "WebSocketServer",
  driver: claudeAgent,  // ← Agent as Driver!
  reactors: [WebSocketReactor.create({ ws: websocket })],
});

await wsAgent.initialize();
await wsAgent.send("Hello!");
// Events are automatically forwarded to WebSocket!
```

### Or use the pre-configured version:

```typescript
import { WebSocketServerAgent } from "@deepractice-ai/agentx-framework/agents";

const agent = WebSocketServerAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ws: websocket,
});

// WebSocketServerAgent = ClaudeAgent + WebSocketReactor
```

### Cross-platform Architecture

```
┌─────────────────────┐          ┌─────────────────────┐
│   Server (Node.js)  │          │   Browser (Web)     │
├─────────────────────┤          ├─────────────────────┤
│ WebSocketServerAgent│  ←───→   │ defineAgent({       │
│ = ClaudeAgent       │   WS     │   driver: WebSocket │
│   + WebSocketReactor│          │   Driver            │
│                     │          │ })                  │
│ • Generates Events  │  ─────→  │ • Receives Events   │
│ • Forwards via WS   │  Events  │ • Renders to UI     │
└─────────────────────┘          └─────────────────────┘
```

### Unlimited Chaining

```typescript
// Agent A: Base Claude
const agentA = ClaudeAgent.create({ apiKey: "xxx" });

// Agent B: A + Translation
const agentB = defineAgent({
  driver: agentA,  // Agent as Driver!
  reactors: [TranslationReactor],
});

// Agent C: B + WebSocket
const agentC = defineAgent({
  driver: agentB,  // Chain continues!
  reactors: [WebSocketReactor],
});

// A → B → C → ... unlimited!
```

## 🎯 Core Concepts

### 1. defineDriver - Create Custom Drivers

```typescript
import { defineDriver } from "@deepractice-ai/agentx-framework";
import { StreamEventBuilder } from "@deepractice-ai/agentx-core";

const EchoDriver = defineDriver({
  name: "Echo",

  async *sendMessage(message, config) {
    // Extract text
    const firstMsg = await extractFirst(message);
    const text = firstMsg.content;

    // Create builder
    const builder = new StreamEventBuilder("echo");

    // Yield events
    yield builder.messageStart("msg_1", "echo-v1");
    yield builder.textContentBlockStart(0);
    yield builder.textDelta(`You said: ${text}`, 0);
    yield builder.textContentBlockStop(0);
    yield builder.messageStop();
  },
});

// Use it
const driver = EchoDriver.create({ sessionId: "test" });
```

**Key points**:
- Only one method: `sendMessage(message, config)`
- Developer fully controls event generation
- Returns `AsyncIterable<StreamEventType>`

### 2. defineReactor - Handle Events

```typescript
import { defineReactor } from "@deepractice-ai/agentx-framework";

const LoggerReactor = defineReactor({
  name: "Logger",

  // Only implement events you care about
  onTextDelta: (event, config) => {
    console.log(event.data.text);
  },

  onMessageComplete: (event, config) => {
    console.log("Message done!");
  },
});

// Use it
const reactor = LoggerReactor.create({ logLevel: "debug" });
```

**Supported event types**:
- **Stream layer**: `onTextDelta`, `onMessageStart`, `onMessageStop`, etc.
- **State layer**: `onConversationStart`, `onToolPlanned`, `onErrorOccurred`, etc.
- **Message layer**: `onUserMessage`, `onAssistantMessage`, `onToolUseMessage`
- **Exchange layer**: `onExchangeRequest`, `onExchangeResponse`

### 3. defineAgent - Compose Everything

```typescript
import { defineAgent, defineConfig } from "@deepractice-ai/agentx-framework";

const MyAgent = defineAgent({
  name: "MyAgent",

  // Driver: how to communicate
  driver: EchoDriver,

  // Reactors: how to handle events (optional)
  reactors: [LoggerReactor],

  // Config: schema and validation (optional)
  config: defineConfig({
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-3-5-sonnet" },
  }),
});

// Create instance
const agent = MyAgent.create({
  apiKey: "xxx",
  // model uses default
});
```

## 📦 Pre-configured Agents

### ClaudeAgent

Uses Claude SDK for Node.js:

```typescript
import { ClaudeAgent } from "@deepractice-ai/agentx-framework/agents";

const agent = ClaudeAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-sonnet-20241022",  // optional
});
```

### WebSocketServerAgent

ClaudeAgent + WebSocket forwarding (Agent composition!):

```typescript
import { WebSocketServerAgent } from "@deepractice-ai/agentx-framework/agents";
import { WebSocket } from "ws";

const ws = new WebSocket("...");

const agent = WebSocketServerAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ws: ws,
});

// All events automatically forwarded to WebSocket!
```

## 🎨 Built-in Drivers & Reactors

### Drivers

- **ClaudeSDKDriver** - Node.js Claude SDK integration
- **WebSocketDriver** - Browser WebSocket client

### Reactors

- **WebSocketReactor** - Forward events to WebSocket

## 📚 Complete Example

```typescript
import {
  defineAgent,
  defineDriver,
  defineReactor,
  defineConfig,
} from "@deepractice-ai/agentx-framework";
import { ClaudeAgent } from "@deepractice-ai/agentx-framework/agents";

// 1. Define custom reactor
const ConsoleReactor = defineReactor({
  name: "Console",

  onTextDelta: (event) => {
    process.stdout.write(event.data.text);
  },

  onMessageStop: () => {
    console.log("\n--- Message Complete ---");
  },
});

// 2. Compose with Claude
const MyAgent = defineAgent({
  name: "MyAgent",
  driver: ClaudeAgent,  // Use pre-built agent!
  reactors: [ConsoleReactor],
  config: defineConfig({
    apiKey: { type: "string", required: true },
  }),
});

// 3. Create and use
const agent = MyAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

await agent.initialize();
await agent.send("Write a haiku about code");
await agent.destroy();
```

## 🏗️ Architecture

### Directory Structure

```
src/
├── interfaces/     # Pure interface definitions
│   ├── StreamReactor.ts
│   ├── StateReactor.ts
│   ├── MessageReactor.ts
│   └── ExchangeReactor.ts
│
├── drivers/        # Driver implementations
│   ├── ClaudeSDKDriver.ts
│   └── WebSocketDriver.ts
│
├── reactors/       # Reactor implementations
│   └── WebSocketReactor.ts
│
├── agents/         # Pre-configured Agents
│   ├── ClaudeAgent.ts
│   └── WebSocketServerAgent.ts
│
├── internal/       # Internal implementations
│   └── ReactorAdapter.ts
│
├── defineDriver.ts
├── defineReactor.ts
├── defineConfig.ts
└── defineAgent.ts
```

### 4-Layer Event System

```
Driver produces Stream events
         ↓
State layer (lifecycle, tool execution)
         ↓
Message layer (complete messages)
         ↓
Exchange layer (analytics, cost)
```

## 🎓 Advanced Patterns

### Multi-stage Processing Pipeline

```typescript
// Stage 1: Raw generation
const rawAgent = ClaudeAgent.create({ apiKey: "xxx" });

// Stage 2: Add translation
const translatedAgent = defineAgent({
  driver: rawAgent,
  reactors: [TranslationReactor],
});

// Stage 3: Add formatting
const formattedAgent = defineAgent({
  driver: translatedAgent,
  reactors: [MarkdownReactor],
});

// rawAgent → translatedAgent → formattedAgent
```

### Conditional Reactors

```typescript
const agent = defineAgent({
  driver: ClaudeAgent,
  reactors: [
    LoggerReactor,
    config.enableDb ? DatabaseReactor : null,
    config.enableMetrics ? MetricsReactor : null,
  ].filter(Boolean),
});
```

### Dynamic Composition

```typescript
// Create base agent
const base = ClaudeAgent.create({ apiKey: "xxx" });

// Dynamically add capabilities
const enhanced = defineAgent({
  driver: base,
  reactors: getUserSelectedReactors(),
});
```

## 🧪 Testing

Agents can be easily mocked for testing:

```typescript
import { defineDriver } from "@deepractice-ai/agentx-framework";

const MockDriver = defineDriver({
  name: "Mock",
  async *sendMessage(message, config) {
    const builder = new StreamEventBuilder("mock");
    yield builder.messageStart("msg_1", "mock");
    yield builder.textDelta(config.mockResponse, 0);
    yield builder.messageStop();
  },
});

// Test agent
const testAgent = defineAgent({
  driver: MockDriver,
  reactors: [YourReactor],
});

const agent = testAgent.create({
  mockResponse: "Mocked response",
});
```

## 🔗 Related Packages

- **[@deepractice-ai/agentx-core](../agentx-core)** - Core engine (EventBus, AgentService)
- **[@deepractice-ai/agentx-types](../agentx-types)** - Message types
- **[@deepractice-ai/agentx-event](../agentx-event)** - Event types

## 📄 License

MIT

---

**Built with ❤️ by Deepractice AI Team**
