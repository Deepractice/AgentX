# @agentxjs/mono-driver

Unified cross-platform LLM driver powered by Vercel AI SDK. One `Driver` interface across multiple providers -- Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, and any OpenAI-compatible API.

## Overview

`@agentxjs/mono-driver` is the recommended default driver for AgentX. It uses direct HTTP API calls via Vercel AI SDK, making it cross-platform (Node.js, Bun, Cloudflare Workers, Edge Runtime) with no subprocess required. This is the driver that `createAgentX` uses automatically in local mode.

For the difference with `@agentxjs/claude-driver`: use mono-driver for multi-provider support and cross-platform deployment. Use claude-driver only when you need Claude Code SDK-specific features (subprocess-based execution, built-in permission management).

## Quick Start

```typescript
import { createMonoDriver } from "@agentxjs/mono-driver";

const driver = createMonoDriver({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant.",
  options: { provider: "anthropic" },
});

await driver.initialize();

for await (const event of driver.receive({ content: "Hello!" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

## API Reference

### `createMonoDriver(config: MonoDriverConfig): Driver`

Factory function. Returns a `Driver` conforming to `@agentxjs/core/driver`.

### MonoDriver

```typescript
class MonoDriver implements Driver {
  readonly name: string;              // "MonoDriver"
  readonly sessionId: string | null;  // available after initialize()
  readonly state: DriverState;        // "idle" | "active" | "disposed"

  initialize(): Promise<void>;       // connects MCP servers, generates session ID
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;
  interrupt(): void;                  // aborts current request
  dispose(): Promise<void>;          // closes MCP clients, cleanup
}
```

### Converter Utilities (advanced)

```typescript
import { toVercelMessage, toVercelMessages, toStopReason } from "@agentxjs/mono-driver";
```

### Re-exported

```typescript
import { stepCountIs } from "@agentxjs/mono-driver"; // from Vercel AI SDK
```

## Configuration

### MonoDriverConfig

`MonoDriverConfig` = `DriverConfig<MonoDriverOptions>` from `@agentxjs/core/driver`.

```typescript
const config: MonoDriverConfig = {
  // Base DriverConfig fields
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

  // MonoDriver-specific
  options: {
    provider: "anthropic",                       // default: "anthropic"
    maxSteps: 10,                                // default: 10
    compatibleConfig: { ... },                   // required when provider = "openai-compatible"
  },
};
```

### MonoDriverOptions

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | `MonoProvider` | `"anthropic"` | LLM provider |
| `maxSteps` | `number` | `10` | Max agentic tool-calling steps per receive() |
| `compatibleConfig` | `OpenAICompatibleConfig` | -- | Required for `"openai-compatible"` provider |

### OpenAICompatibleConfig

```typescript
interface OpenAICompatibleConfig {
  name: string;       // provider name (for logging)
  baseURL: string;    // API base URL
  apiKey?: string;    // overrides top-level apiKey
}
```

### Supported Providers

| Provider | Key | Default Model |
|---|---|---|
| Anthropic | `"anthropic"` | `claude-sonnet-4-20250514` |
| OpenAI | `"openai"` | `gpt-4o` |
| Google | `"google"` | `gemini-2.0-flash` |
| xAI | `"xai"` | `grok-3` |
| DeepSeek | `"deepseek"` | `deepseek-chat` |
| Mistral | `"mistral"` | `mistral-large-latest` |
| OpenAI-Compatible | `"openai-compatible"` | `default` |

## Provider Examples

### Anthropic

```typescript
createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "assistant",
  options: { provider: "anthropic" },
});
```

### OpenAI

```typescript
createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "gpt-4o",
  options: { provider: "openai" },
});
```

### DeepSeek

```typescript
createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "deepseek-chat",
  options: { provider: "deepseek" },
});
```

### Ollama (OpenAI-Compatible)

```typescript
createMonoDriver({
  apiKey: "ollama",     // Ollama doesn't require a real key
  agentId: "assistant",
  model: "llama3",
  options: {
    provider: "openai-compatible",
    compatibleConfig: {
      name: "ollama",
      baseURL: "http://localhost:11434/v1",
    },
  },
});
```

### LM Studio (OpenAI-Compatible)

```typescript
createMonoDriver({
  apiKey: "lm-studio",
  agentId: "assistant",
  model: "local-model",
  options: {
    provider: "openai-compatible",
    compatibleConfig: {
      name: "lm-studio",
      baseURL: "http://localhost:1234/v1",
    },
  },
});
```

### Kimi / Moonshot AI (OpenAI-Compatible)

```typescript
createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "moonshot-v1-8k",
  options: {
    provider: "openai-compatible",
    compatibleConfig: {
      name: "kimi",
      baseURL: "https://api.moonshot.cn/v1",
      apiKey: "sk-moonshot-xxxxx",   // overrides top-level apiKey
    },
  },
});
```

## MCP Server Configuration

MonoDriver connects to MCP servers during `initialize()` and discovers tools automatically.

```typescript
createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "my-agent",
  mcpServers: {
    // Stdio -- local subprocess
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    },
    // HTTP Streamable -- remote server
    remote: {
      type: "http",
      url: "https://mcp.example.com/mcp",
      headers: { Authorization: "Bearer token" },
    },
  },
  options: { provider: "anthropic" },
});
```

MCP tools are merged with `tools` from config. Config tools take precedence on name conflicts.

## Important Notes

- **API key is always passed via config**, never read from environment variables.
- **`baseUrl` auto-appends `/v1`** if missing (Vercel AI SDK requirement).
- **Stateless**: reads history from `config.session` on each `receive()`. Does not maintain internal history.
- **Cross-platform**: runs on Node.js, Bun, Workers, Edge -- no subprocess needed.
