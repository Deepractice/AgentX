# @agentxjs/mono-driver

Unified cross-platform LLM driver powered by Vercel AI SDK. One `Driver` interface across multiple providers -- Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, and any OpenAI-compatible API.

## Overview

`@agentxjs/mono-driver` is the recommended default driver for AgentX. It uses direct HTTP API calls via Vercel AI SDK, making it cross-platform (Node.js, Bun, Cloudflare Workers, Edge Runtime) with no subprocess required.

For the difference with `@agentxjs/claude-driver`: use mono-driver for multi-provider support and cross-platform deployment. Use claude-driver only when you need Claude Code SDK-specific features (subprocess-based execution, built-in permission management).

## Quick Start

### Basic Usage (No RoleX)

```typescript
import { createMonoDriver } from "@agentxjs/mono-driver";

const driver = createMonoDriver({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant.",
  provider: "anthropic",
});

await driver.initialize();

for await (const event of driver.receive({ content: "Hello!" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

### With RoleX Integration

```typescript
import { createMonoDriver } from "@agentxjs/mono-driver";
import { localPlatform } from "@rolexjs/local-platform";

// 1. Create RoleX platform (uses ~/.deepractice/rolex by default)
const rolexPlatform = localPlatform();

// 2. Create driver with RoleX enabled
const driver = createMonoDriver({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentId: "my-agent",
  provider: "anthropic",
  rolex: {
    platform: rolexPlatform,
    roleId: "nuwa",  // The individual to activate
  },
});

// 3. Initialize — auto-activates the role
await driver.initialize();

// 4. Every receive() call refreshes Role Context automatically
for await (const event of driver.receive({ content: "你好，你是谁？" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

### With AgentX Runtime

```typescript
import { createAgentX } from "agentxjs";
import { createNodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";
import { localPlatform } from "@rolexjs/local-platform";

// Two platforms, independently managed
const platform = await createNodePlatform({
  dataPath: "~/.deepractice/agentx",
});
const rolexPlatform = localPlatform({
  dataDir: "~/.deepractice/rolex",
});

// createDriver closure — rolexPlatform is static, roleId flows from ImageRecord
const createDriver = (config) => createMonoDriver({
  ...config,
  provider: "anthropic",
  rolex: config.customData?.roleId
    ? { platform: rolexPlatform, roleId: config.customData.roleId }
    : undefined,
});

const ax = createAgentX({ platform, createDriver });
```

## RoleX Integration

When `rolex` config is provided, MonoDriver enables the full RoleX role system:

### What Happens

1. **`initialize()`** — Auto-activates the configured role via RolexBridge
2. **Tool Registration** — All RoleX tools become available to the LLM:
   - Identity: `activate`, `inspect`, `survey`
   - Execution: `want`, `plan`, `todo`, `finish`, `complete`, `abandon`, `focus`
   - Cognition: `reflect`, `realize`, `master`, `forget`
   - Skills: `skill`, `use`, `direct`
3. **Context Injection** — Every `receive()` call refreshes the three-layer context

### Three-Layer Context Model

```
┌─────────────────────────────────────────────┐
│ Layer 1: System Prompt                      │  ← Fixed, from config.systemPrompt
├─────────────────────────────────────────────┤
│ Layer 2: <role-context>                     │  ← Dynamic, refreshed each turn
│   ├── World Instructions                   │  ← RoleX cognitive framework
│   └── Role State Projection                │  ← Active role's state tree
├─────────────────────────────────────────────┤
│ Layer 3: Message Context                   │  ← Conversation history
└─────────────────────────────────────────────┘
```

- **Layer 1** is static — set once via `config.systemPrompt`
- **Layer 2** is dynamic — `buildSystemPrompt()` calls `RolexBridge.getRoleContext()` before each `streamText()`, so the LLM always sees the latest role state
- **Layer 3** is managed by the Session — MonoDriver reads history from `config.session`

### RoleX Config

```typescript
rolex: {
  platform: Platform,  // Required — RoleX Platform instance
  roleId: string,      // Required — Individual ID to activate
}
```

All-or-nothing: provide `rolex` to enable the full RoleX integration, omit it to disable entirely. No partial configuration is allowed.

### Platform Separation

RoleX Platform and AgentX Platform are completely independent:

```
~/.deepractice/
  ├── agentx/     ← AgentX data (SQLite, sessions, images)
  └── rolex/      ← RoleX data (roles, goals, experiences)
```

- `rolexPlatform` is **static** — created once at startup, shared across all agents
- `roleId` is **dynamic** — per-agent, comes from ImageRecord via DriverConfig
- Deleting an Image does NOT delete the RoleX role data (independent lifecycles)

## Configuration

### MonoDriverConfig

`MonoDriverConfig` = `DriverConfig<MonoDriverOptions>` — all fields are flat (no nesting).

```typescript
const config: MonoDriverConfig = {
  // === Base DriverConfig fields ===
  apiKey: "sk-ant-xxxxx",                        // required
  agentId: "my-agent",                           // required
  model: "claude-sonnet-4-20250514",             // optional, uses provider default
  baseUrl: "https://custom.api",                 // optional
  systemPrompt: "You are ...",                   // optional
  cwd: "/path/to/workdir",                       // optional
  mcpServers: { ... },                           // optional
  tools: [myTool],                               // optional
  session: mySession,                            // optional, for history
  timeout: 600000,                               // optional, default: 10 min

  // === MonoDriver-specific (flat) ===
  provider: "anthropic",                         // default: "anthropic"
  maxSteps: 10,                                  // default: 10
  compatibleConfig: { ... },                     // required when provider = "openai-compatible"
  rolex: {                                       // optional, enables RoleX
    platform: localPlatform(),
    roleId: "nuwa",
  },
};
```

### MonoDriverOptions

| Field              | Type                     | Default       | Description                                  |
| ------------------ | ------------------------ | ------------- | -------------------------------------------- |
| `provider`         | `MonoProvider`           | `"anthropic"` | LLM provider                                 |
| `maxSteps`         | `number`                 | `10`          | Max agentic tool-calling steps per receive() |
| `compatibleConfig` | `OpenAICompatibleConfig` | --            | Required for `"openai-compatible"` provider  |
| `rolex`            | `{ platform, roleId }`  | --            | RoleX integration config                     |

### Supported Providers

| Provider          | Key                   | Default Model              |
| ----------------- | --------------------- | -------------------------- |
| Anthropic         | `"anthropic"`         | `claude-sonnet-4-20250514` |
| OpenAI            | `"openai"`            | `gpt-4o`                   |
| Google            | `"google"`            | `gemini-2.0-flash`         |
| xAI               | `"xai"`               | `grok-3`                   |
| DeepSeek          | `"deepseek"`          | `deepseek-chat`            |
| Mistral           | `"mistral"`           | `mistral-large-latest`     |
| OpenAI-Compatible | `"openai-compatible"` | `default`                  |

## Provider Examples

### Anthropic

```typescript
createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "assistant",
  provider: "anthropic",
});
```

### OpenAI

```typescript
createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "gpt-4o",
  provider: "openai",
});
```

### DeepSeek

```typescript
createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "deepseek-chat",
  provider: "deepseek",
});
```

### Ollama (OpenAI-Compatible)

```typescript
createMonoDriver({
  apiKey: "ollama",
  agentId: "assistant",
  model: "llama3",
  provider: "openai-compatible",
  compatibleConfig: {
    name: "ollama",
    baseURL: "http://localhost:11434/v1",
  },
});
```

## Testing

```bash
# Unit tests (mock RoleX)
bun test

# Record a RoleX integration fixture (requires API key)
bun run scripts/record-rolex.ts "你好" rolex-hello nuwa
```

## Important Notes

- **API key is always passed via config**, never read from environment variables.
- **`baseUrl` auto-appends `/v1`** if missing (Vercel AI SDK requirement).
- **Stateless**: reads history from `config.session` on each `receive()`. Does not maintain internal history.
- **Cross-platform**: runs on Node.js, Bun, Workers, Edge -- no subprocess needed.
- **Flat config**: all options are at the top level (`config.provider`, not `config.options.provider`).
- **RoleX is all-or-nothing**: provide `rolex` config to enable, omit to disable. No partial state.
