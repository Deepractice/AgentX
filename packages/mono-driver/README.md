# @agentxjs/mono-driver

Unified cross-platform LLM driver powered by [Vercel AI SDK](https://sdk.vercel.ai/). Provides a single `Driver` interface across multiple LLM providers -- Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, and any OpenAI-compatible API.

MonoDriver is the default driver used in local mode by `createAgentX`.

## Installation

```bash
bun add @agentxjs/mono-driver
```

## Supported Providers

| Provider | Key | Default Model | SDK |
|---|---|---|---|
| Anthropic | `anthropic` | `claude-sonnet-4-20250514` | `@ai-sdk/anthropic` |
| OpenAI | `openai` | `gpt-4o` | `@ai-sdk/openai` |
| Google | `google` | `gemini-2.0-flash` | `@ai-sdk/google` |
| xAI | `xai` | `grok-3` | `@ai-sdk/xai` |
| DeepSeek | `deepseek` | `deepseek-chat` | `@ai-sdk/deepseek` |
| Mistral | `mistral` | `mistral-large-latest` | `@ai-sdk/mistral` |
| OpenAI-Compatible | `openai-compatible` | `default` | `@ai-sdk/openai-compatible` |

The `openai-compatible` provider works with any API that follows the OpenAI chat completions format, including Ollama, LM Studio, Kimi (Moonshot AI), GLM (Zhipu AI), and others.

## Quick Start

```typescript
import { createMonoDriver } from "@agentxjs/mono-driver";

const driver = createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant.",
  options: {
    provider: "anthropic",
  },
});

await driver.initialize();

for await (const event of driver.receive({ content: "Hello!" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

## Configuration

### MonoDriverConfig

`MonoDriverConfig` extends `DriverConfig<MonoDriverOptions>` from `@agentxjs/core/driver`. It combines the base driver configuration with MonoDriver-specific options.

```typescript
import type { MonoDriverConfig } from "@agentxjs/mono-driver";

const config: MonoDriverConfig = {
  // --- Provider Configuration ---
  apiKey: "sk-xxxxx",            // API key (required, always passed via config)
  baseUrl: "https://custom.api", // Custom API endpoint (optional)
  model: "claude-sonnet-4-20250514",  // Model identifier (optional, uses provider default)
  timeout: 600000,               // Request timeout in ms (optional, default: 10 minutes)

  // --- Agent Configuration ---
  agentId: "my-agent",           // Agent ID for identification and logging
  systemPrompt: "You are ...",   // System prompt (optional)
  cwd: "/path/to/workdir",      // Working directory for tool execution (optional)
  mcpServers: { ... },           // MCP server configuration (optional)

  // --- Session Configuration ---
  session: mySession,            // Session for message history access (optional)
  resumeSessionId: "mono_...",   // Session ID to resume (optional)
  onSessionIdCaptured: (id) => { // Callback when session ID is assigned (optional)
    console.log("Session ID:", id);
  },

  // --- MonoDriver Options ---
  options: {
    provider: "anthropic",       // LLM provider (default: "anthropic")
    maxSteps: 10,                // Max agentic steps for tool calling (default: 10)
  },
};
```

### MonoDriverOptions

```typescript
interface MonoDriverOptions {
  provider?: MonoProvider;                  // "anthropic" | "openai" | "google" | "xai" | "deepseek" | "mistral" | "openai-compatible"
  maxSteps?: number;                        // Max agentic loop steps (default: 10)
  compatibleConfig?: OpenAICompatibleConfig; // Required when provider is "openai-compatible"
}
```

### OpenAICompatibleConfig

Required when using the `openai-compatible` provider.

```typescript
interface OpenAICompatibleConfig {
  name: string;      // Provider name (for logging and identification)
  baseURL: string;   // Base URL of the OpenAI-compatible API
  apiKey?: string;    // API key (falls back to top-level apiKey if omitted)
}
```

## Provider Examples

### Anthropic (default)

```typescript
const driver = createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "assistant",
  model: "claude-sonnet-4-20250514",
  options: { provider: "anthropic" },
});
```

### OpenAI

```typescript
const driver = createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "gpt-4o",
  options: { provider: "openai" },
});
```

### Google

```typescript
const driver = createMonoDriver({
  apiKey: "AIza-xxxxx",
  agentId: "assistant",
  model: "gemini-2.0-flash",
  options: { provider: "google" },
});
```

### xAI

```typescript
const driver = createMonoDriver({
  apiKey: "xai-xxxxx",
  agentId: "assistant",
  model: "grok-3",
  options: { provider: "xai" },
});
```

### DeepSeek

```typescript
const driver = createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "deepseek-chat",
  options: { provider: "deepseek" },
});
```

### Mistral

```typescript
const driver = createMonoDriver({
  apiKey: "xxxxx",
  agentId: "assistant",
  model: "mistral-large-latest",
  options: { provider: "mistral" },
});
```

### OpenAI-Compatible (Ollama)

```typescript
const driver = createMonoDriver({
  apiKey: "ollama",  // Ollama does not require a real key
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

### OpenAI-Compatible (LM Studio)

```typescript
const driver = createMonoDriver({
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

### OpenAI-Compatible (Kimi / Moonshot AI)

```typescript
const driver = createMonoDriver({
  apiKey: "sk-xxxxx",
  agentId: "assistant",
  model: "moonshot-v1-8k",
  options: {
    provider: "openai-compatible",
    compatibleConfig: {
      name: "kimi",
      baseURL: "https://api.moonshot.cn/v1",
      apiKey: "sk-moonshot-xxxxx", // overrides top-level apiKey
    },
  },
});
```

## API Reference

### `createMonoDriver(config: MonoDriverConfig): Driver`

Factory function that creates a `MonoDriver` instance. Implements the `CreateDriver<MonoDriverOptions>` type from `@agentxjs/core/driver`.

```typescript
import { createMonoDriver } from "@agentxjs/mono-driver";

const driver = createMonoDriver({ apiKey: "...", agentId: "my-agent" });
```

### MonoDriver Class

`MonoDriver` implements the `Driver` interface from `@agentxjs/core/driver`.

#### Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Always `"MonoDriver"` |
| `sessionId` | `string \| null` | Session ID, available after `initialize()` |
| `state` | `DriverState` | Current state: `"idle"`, `"active"`, or `"disposed"` |

#### Methods

##### `initialize(): Promise<void>`

Initializes the driver, generates a session ID, and connects to any configured MCP servers. Must be called before `receive()`. Throws if the driver is not in the `"idle"` state.

##### `receive(message: UserMessage): AsyncIterable<DriverStreamEvent>`

Sends a user message to the LLM and returns an async iterable of stream events. The driver reads conversation history from the configured `Session` object, converts it to Vercel AI SDK format, and streams the response back as `DriverStreamEvent` values.

Throws if the driver is `"disposed"` or already `"active"`.

##### `interrupt(): void`

Interrupts the current `receive()` operation. The async iterable will emit an `"interrupted"` event and complete. No-op if the driver is not active.

##### `dispose(): Promise<void>`

Disposes the driver and releases resources. Closes all MCP client connections, aborts any in-flight request. The driver cannot be used after disposal.

### Stream Events

Events emitted by `receive()`:

| Event Type | Data Fields | Description |
|---|---|---|
| `message_start` | `messageId`, `model` | Start of a new message |
| `text_delta` | `text` | Incremental text chunk |
| `tool_use_start` | `toolCallId`, `toolName` | Tool call initiated |
| `input_json_delta` | `partialJson` | Incremental tool input JSON |
| `tool_use_stop` | `toolCallId`, `toolName`, `input` | Tool call complete with parsed input |
| `tool_result` | `toolCallId`, `result`, `isError` | Tool execution result |
| `message_stop` | `stopReason` | Message complete |
| `error` | `message`, `errorCode` | Error occurred |
| `interrupted` | `reason` | Operation was interrupted |

### Converter Utilities

Exported for advanced usage:

```typescript
import { toVercelMessage, toVercelMessages, toStopReason } from "@agentxjs/mono-driver";
```

- `toVercelMessage(message: Message)` -- Converts a single AgentX Message to a Vercel AI SDK ModelMessage.
- `toVercelMessages(messages: Message[])` -- Converts an array of AgentX Messages.
- `toStopReason(finishReason: string)` -- Maps a Vercel AI SDK finish reason to an AgentX `StopReason`.

## MCP Server Support

MonoDriver can connect to [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) servers to give the LLM access to external tools. MCP servers are started as stdio subprocesses during `initialize()` and their tools are automatically discovered and made available to the LLM.

```typescript
const driver = createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant.",
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
    },
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "ghp_xxxxx" },
    },
  },
  options: { provider: "anthropic" },
});

await driver.initialize(); // Starts MCP servers, discovers tools
```

### McpServerConfig

Each entry in `mcpServers` maps a server name to its configuration. Two transport types are supported:

**Stdio (local subprocess):**

| Field | Type | Description |
|---|---|---|
| `command` | `string` | Command to start the server (e.g. `npx`, `node`, `python`) |
| `args` | `string[]` | Command arguments (optional) |
| `env` | `Record<string, string>` | Environment variables (optional) |

**HTTP Streamable (remote server):**

| Field | Type | Description |
|---|---|---|
| `type` | `"http"` | Transport type discriminator (required) |
| `url` | `string` | URL of the remote MCP server |
| `headers` | `Record<string, string>` | HTTP headers, e.g. `Authorization` (optional) |

```typescript
const driver = createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "my-agent",
  mcpServers: {
    // Stdio — local subprocess
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    },
    // HTTP Streamable — remote server
    remote: {
      type: "http",
      url: "https://mcp.example.com/mcp",
      headers: { Authorization: "Bearer token-xxx" },
    },
  },
});
```

### How It Works

1. **`initialize()`** -- For each server in `mcpServers`, spawns a child process via stdio transport, connects via MCP protocol, and calls `tools/list` to discover available tools.
2. **`receive()`** -- MCP tools are merged with any `tools` from the config (e.g. bash tool). If both define a tool with the same name, config tools take precedence. All tools are passed to the LLM via Vercel AI SDK's `streamText`.
3. **`dispose()`** -- Closes all MCP client connections and terminates server processes.

### Using MCP Tools with Config Tools

MCP servers and explicit `tools` can be used together:

```typescript
import { createBashTool } from "@agentxjs/core/bash";

const driver = createMonoDriver({
  apiKey: "sk-ant-xxxxx",
  agentId: "my-agent",
  tools: [bashTool],       // Explicit tools
  mcpServers: {            // MCP-discovered tools
    filesystem: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] },
  },
});
```

Config tools override MCP tools with the same name, ensuring platform-provided tools always take priority.

## Important Notes

- **API key is always passed via config.** MonoDriver does not read API keys from environment variables. Always provide `apiKey` explicitly in the configuration object.

- **baseUrl auto-appends `/v1` if missing.** Vercel AI SDK provider packages expect the base URL to include the version path (e.g., `https://api.example.com/v1`). If your `baseUrl` does not end with `/v1`, MonoDriver appends it automatically. Trailing slashes are stripped before the check.

- **Stateless driver.** MonoDriver does not maintain conversation history internally. It reads message history from the `Session` object provided in the config on each `receive()` call. This is different from stateful drivers (like ClaudeDriver) that manage history via their own SDK.

- **Cross-platform.** Because MonoDriver uses Vercel AI SDK (direct HTTP calls), it runs on Node.js, Bun, Cloudflare Workers, and Edge Runtime -- no subprocess required.

- **Agentic loop.** The `maxSteps` option controls how many tool-call steps the AI SDK will execute in a single `receive()` call. The default is 10. The SDK uses `stepCountIs()` as the stop condition.

## License

MIT
