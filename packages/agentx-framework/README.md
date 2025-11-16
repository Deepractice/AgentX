# @deepractice-ai/agentx-framework

**AgentX Framework** - Unified API for defining and creating AI agents with a Vue-like developer experience.

## 📋 Overview

AgentX Framework is the **developer toolkit** for building AI agents. It provides:

- 🎯 **Config-first approach** - Define configuration schema with validation
- 🔌 **Platform-agnostic** - Works with any driver (Claude, WebSocket, custom)
- 🎭 **Reactor pattern** - Type-safe event handling
- 📦 **Reusable definitions** - Define once, create many times
- 🔍 **Type inference** - Full TypeScript support with automatic type inference

## 🚀 Quick Start

### Installation

```bash
pnpm add @deepractice-ai/agentx-framework

# Platform-specific drivers
pnpm add @deepractice-ai/agentx-node  # For Node.js with Claude SDK
# or
pnpm add @deepractice-ai/agentx-browser  # For browser with WebSocket
```

### Basic Usage

```typescript
import { defineAgent } from "@deepractice-ai/agentx-framework";
import { ClaudeDriver } from "@deepractice-ai/agentx-node";
import { PinoLogger } from "@deepractice-ai/agentx-node";

// 1. Define your agent structure
const MyAgent = defineAgent({
  // Config schema - defines what configuration is needed
  config: {
    apiKey: { type: String, required: true },
    model: { type: String, default: "claude-3-5-sonnet-20241022" },
    maxTurns: { type: Number, default: 10 },
  },

  // Driver factory - how to create the driver
  driver: (config) => new ClaudeDriver({
    apiKey: config.apiKey,
    model: config.model,
    maxTurns: config.maxTurns,
  }),

  // Logger factory (optional)
  logger: (config) => new PinoLogger({ level: "info" }),
});

// 2. Create an instance with your config
const agent = MyAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // model and maxTurns use defaults
});

// 3. Use the agent
await agent.initialize();

agent.react({
  onAssistantMessage(event) {
    console.log("Assistant:", event.data.content);
  },
});

await agent.send("Hello!");
await agent.destroy();
```

## 🎯 Core Concepts

### 1. defineAgent - Vue-like Agent Definition

```typescript
const MyAgent = defineAgent({
  config: { /* schema */ },
  driver: (config) => /* driver instance */,
  reactors: [(config) => /* reactor instance */],
  logger: (config) => /* logger instance */,
});
```

**Key points**:
- **Separates definition from instantiation** - Like Vue's `defineComponent`
- **Config-first** - Schema defines what configuration is needed
- **Factory functions** - Driver, reactors, and logger are created from config
- **Type-safe** - TypeScript infers config types from schema

### 2. Config Schema - Type-safe Configuration

Define your configuration structure with validation:

```typescript
config: {
  // Required field
  apiKey: { type: String, required: true },

  // Field with default value
  model: { type: String, default: "claude-3-5-sonnet-20241022" },

  // Optional field
  debug: { type: Boolean, optional: true },

  // Number field
  maxTurns: { type: Number, default: 10 },
}
```

**Supported types**:
- `String` - string values
- `Number` - number values
- `Boolean` - boolean values
- `Object` - object values

**Field properties**:
- `type` - Field type (required)
- `required` - Must be provided by user
- `default` - Default value if not provided
- `optional` - Can be undefined

### 3. Driver Factory - Platform Abstraction

```typescript
driver: (config) => new ClaudeDriver({
  apiKey: config.apiKey,
  model: config.model,
})
```

**Available drivers**:
- `ClaudeDriver` (from `@deepractice-ai/agentx-node`) - Node.js with Claude SDK
- `BrowserDriver` (from `@deepractice-ai/agentx-browser`) - Browser with WebSocket
- Custom drivers implementing `AgentDriver` interface

### 4. Reactors - Event Handling

Reactors are type-safe event handlers that receive events from the agent.

```typescript
import type { MessageReactor } from "@deepractice-ai/agentx-framework";

// Define your reactor
class ChatLogger implements MessageReactor {
  constructor(private config: { prefix: string }) {}

  onUserMessage(event) {
    console.log(`${this.config.prefix} User:`, event.data.content);
  }

  onAssistantMessage(event) {
    console.log(`${this.config.prefix} Assistant:`, event.data.content);
  }

  onToolUseMessage(event) {
    console.log(`${this.config.prefix} Tool:`, event.data.toolCall.name);
  }

  onErrorMessage(event) {
    console.error(`${this.config.prefix} Error:`, event.data.message);
  }
}

// Use in defineAgent
const MyAgent = defineAgent({
  config: {
    apiKey: { type: String, required: true },
    logPrefix: { type: String, default: "[App]" },
  },

  driver: (config) => new ClaudeDriver({ apiKey: config.apiKey }),

  // Reactor factories get the config
  reactors: [
    (config) => new ChatLogger({ prefix: config.logPrefix }),
  ],
});
```

**Reactor types**:
- `StreamReactor` - Handle streaming events (text deltas, tool use, etc.)
- `StateReactor` - Handle state transitions (thinking, responding, etc.)
- `MessageReactor` - Handle complete messages (user, assistant, tool use)
- `ExchangeReactor` - Handle request/response pairs (analytics, cost tracking)

**Partial reactors**:
All reactors support partial implementation - only implement methods you need!

```typescript
agent.react({
  // Only handle assistant messages
  onAssistantMessage(event) {
    console.log(event.data.content);
  },
});
```

## 📚 Complete Example

```typescript
import { defineAgent } from "@deepractice-ai/agentx-framework";
import { ClaudeDriver } from "@deepractice-ai/agentx-node";
import { PinoLogger } from "@deepractice-ai/agentx-node";
import type { MessageReactor, ExchangeReactor } from "@deepractice-ai/agentx-framework";

// Define custom reactors
class ChatLogger implements MessageReactor {
  constructor(private options: { level: string }) {}

  onUserMessage(event) {
    if (this.options.level === "debug") {
      console.log("[User]", event.data.content);
    }
  }

  onAssistantMessage(event) {
    console.log("[Assistant]", event.data.content);
  }

  onToolUseMessage(event) {
    console.log("[Tool]", event.data.toolCall.name);
  }

  onErrorMessage(event) {
    console.error("[Error]", event.data.message);
  }
}

class Analytics implements ExchangeReactor {
  onExchangeRequest(event) {
    console.log("Request started:", event.data.userMessage.id);
  }

  onExchangeResponse(event) {
    console.log("Response completed:", {
      duration: event.data.durationMs,
      cost: event.data.costUsd,
      tokens: event.data.usage,
    });
  }
}

// Define agent
const MyAgent = defineAgent({
  // Configuration schema
  config: {
    // Driver config
    apiKey: { type: String, required: true },
    model: { type: String, default: "claude-3-5-sonnet-20241022" },
    maxTurns: { type: Number, default: 10 },

    // Reactor config
    logLevel: { type: String, default: "info" },
    enableAnalytics: { type: Boolean, default: false },
  },

  // Driver factory
  driver: (config) => new ClaudeDriver({
    apiKey: config.apiKey,
    model: config.model,
    maxTurns: config.maxTurns,
  }),

  // Reactors factories
  reactors: [
    (config) => new ChatLogger({ level: config.logLevel }),
    (config) => config.enableAnalytics ? new Analytics() : null,
  ],

  // Logger factory
  logger: (config) => new PinoLogger({
    level: config.logLevel,
  }),
});

// Create instance
const agent = MyAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  logLevel: "debug",
  enableAnalytics: true,
});

// Initialize and use
await agent.initialize();

// Can still add dynamic reactors
agent.react({
  onAssistantMessage(event) {
    // Update UI or do something else
  },
});

await agent.send("Hello, how can you help me?");

// Clean up
await agent.destroy();
```

## 🎨 Advanced Patterns

### Multi-Environment Configuration

```typescript
// config/agents.ts
import { defineAgent } from "@deepractice-ai/agentx-framework";
import { ClaudeDriver } from "@deepractice-ai/agentx-node";

const baseDefinition = {
  config: {
    apiKey: { type: String, required: true },
    model: { type: String, default: "claude-3-5-sonnet-20241022" },
    logLevel: { type: String, default: "info" },
  },
  driver: (config) => new ClaudeDriver({
    apiKey: config.apiKey,
    model: config.model,
  }),
};

export const ProductionAgent = defineAgent({
  ...baseDefinition,
  logger: (config) => new PinoLogger({ level: "error" }),
  reactors: [
    (config) => new SentryReactor(),
    (config) => new AnalyticsReactor(),
  ],
});

export const DevelopmentAgent = defineAgent({
  ...baseDefinition,
  logger: (config) => new PinoLogger({ level: "debug", pretty: true }),
  reactors: [
    (config) => new DebugReactor(),
  ],
});

// app.ts
const AgentType = process.env.NODE_ENV === "production"
  ? ProductionAgent
  : DevelopmentAgent;

const agent = AgentType.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Conditional Reactors

```typescript
const MyAgent = defineAgent({
  config: {
    apiKey: { type: String, required: true },
    enableDb: { type: Boolean, default: false },
    dbUrl: { type: String, optional: true },
    enableMetrics: { type: Boolean, default: false },
  },

  driver: (config) => new ClaudeDriver({ apiKey: config.apiKey }),

  reactors: [
    // Always enabled
    (config) => new ChatLogger(),

    // Conditional - only if enableDb is true
    (config) => config.enableDb && config.dbUrl
      ? new DatabaseReactor({ url: config.dbUrl })
      : null,

    // Conditional - only if enableMetrics is true
    (config) => config.enableMetrics
      ? new MetricsReactor()
      : null,
  ].filter(Boolean),
});
```

### Testing with Mock Driver

```typescript
// tests/agent.test.ts
import { defineAgent } from "@deepractice-ai/agentx-framework";

class MockDriver implements AgentDriver {
  readonly sessionId = "test-session";
  readonly driverSessionId = "mock-driver";

  async connect(eventBus) {
    // Mock implementation
  }

  abort() {}
  async destroy() {}
}

const TestAgent = defineAgent({
  config: {
    mockResponses: { type: Object, default: [] },
  },

  driver: (config) => new MockDriver(config.mockResponses),
});

describe("MyAgent", () => {
  it("should handle messages", async () => {
    const agent = TestAgent.create({
      mockResponses: ["Hello!", "How are you?"],
    });

    await agent.initialize();
    await agent.send("Hi");

    expect(agent.messages).toHaveLength(2);
  });
});
```

## 📖 API Reference

### defineAgent(definition)

Defines a reusable agent structure.

**Parameters**:
- `definition.config` - Config schema defining required and optional fields
- `definition.driver` - Factory function creating AgentDriver from config
- `definition.reactors` - Optional array of reactor factory functions
- `definition.logger` - Optional factory function creating AgentLogger

**Returns**: `DefinedAgent` with `create()` method

### DefinedAgent.create(config)

Creates an agent instance with the provided configuration.

**Parameters**:
- `config` - User configuration (partial, merged with defaults)

**Returns**: `AgentService` instance

**Throws**: Error if required config fields are missing or types are invalid

### DefinedAgent.getDefinition()

Returns the original definition passed to `defineAgent()`.

**Returns**: `AgentDefinition`

## 🔗 Related Packages

- **[@deepractice-ai/agentx-core](../agentx-core)** - Core implementation (AgentService, EventBus, Reactors)
- **[@deepractice-ai/agentx-node](../agentx-node)** - Node.js platform (ClaudeDriver, PinoLogger)
- **[@deepractice-ai/agentx-browser](../agentx-browser)** - Browser platform (BrowserDriver, ConsoleLogger)
- **[@deepractice-ai/agentx-types](../agentx-types)** - Message types
- **[@deepractice-ai/agentx-event](../agentx-event)** - Event types

## 📝 Design Philosophy

### Framework vs SDK

- **Framework** (this package) - Developer toolkit for **defining** agents
  - Provides `defineAgent` for creating reusable agent definitions
  - Config schema, validation, and type inference
  - Re-exports all necessary types

- **SDK** (`agentx-node`, `agentx-browser`) - Platform-specific **implementations**
  - Provides ready-to-use drivers and loggers
  - Platform-optimized (Node.js or Browser)
  - Can provide convenience wrappers (e.g., `createClaudeAgent()`)

### Inspiration

AgentX Framework draws inspiration from:
- **Vue 3** - `defineComponent` pattern, composition API
- **Zod** - Schema validation with type inference
- **React** - Component-based architecture
- **GraphQL** - Schema-first design

## 📄 License

MIT

---

**Built with ❤️ by Deepractice AI Team**
