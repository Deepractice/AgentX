# agentxjs

> Unified API for AI Agents - Server and Browser

The `agentxjs` package provides a **unified API** for building AI agents that works seamlessly across server (Node.js) and browser environments.

## Features

- **Unified API** - Same `createAgentX()` function for both local and remote modes
- **Two Modes** - Local mode (embedded runtime) and Remote mode (WebSocket client)
- **Type-Safe** - TypeScript discriminated unions for configuration
- **Event-Driven** - Real-time streaming with 4-layer event system
- **Built-in Server** - Local mode includes WebSocket server for remote clients

## Installation

```bash
# Using bun (recommended)
bun add agentxjs

# Using npm
npm install agentxjs

# Using pnpm
pnpm add agentxjs
```

## Quick Start

### Local Mode (Server/Node.js)

Local mode runs AgentX with an embedded runtime, connecting directly to the Claude API.

```typescript
import { createAgentX } from "agentxjs";

// Create AgentX - reads ANTHROPIC_API_KEY from environment
const agentx = await createAgentX();

// Or with explicit configuration
const agentx = await createAgentX({
  llm: {
    apiKey: "sk-ant-...",
    model: "claude-sonnet-4-20250514",
  },
});

// Subscribe to streaming text
agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

// Create a container
await agentx.request("container_create_request", {
  containerId: "my-container",
});

// Create an image and run an agent
const { data: image } = await agentx.request("image_create_request", {
  containerId: "my-container",
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});

const { data: agent } = await agentx.request("image_run_request", {
  imageId: image.imageId,
});

// Send a message
await agentx.request("message_send_request", {
  sessionId: agent.sessionId,
  content: "Hello!",
});

// Optionally start WebSocket server for remote clients
await agentx.listen(5200);
console.log("Server running on ws://localhost:5200");

// Cleanup
await agentx.dispose();
```

### Remote Mode (Browser/Client)

Remote mode connects to an AgentX server via WebSocket. Works in both browser and Node.js.

```typescript
import { createAgentX } from "agentxjs";

// Connect to AgentX server
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
});

// Same API as local mode!
agentx.on("text_delta", (e) => {
  console.log(e.data.text);
});

await agentx.request("container_create_request", {
  containerId: "my-container",
});

// Cleanup
await agentx.dispose();
```

### Remote Mode with Authentication

```typescript
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  // Static headers
  headers: { Authorization: "Bearer sk-xxx" },
  // Or dynamic headers
  headers: async () => ({
    Authorization: `Bearer ${await fetchToken()}`,
  }),
  // Business context (merged into all requests)
  context: {
    userId: "user-123",
    tenantId: "tenant-abc",
  },
});
```

## API Reference

### createAgentX()

Factory function that creates an AgentX instance.

```typescript
function createAgentX(config?: AgentXConfig): Promise<AgentX>;
```

Mode is determined by the presence of `serverUrl`:

| Configuration               | Mode   | Use Case               |
| --------------------------- | ------ | ---------------------- |
| `{}` or `{ llm: {...} }`    | Local  | Server, CLI, Backend   |
| `{ serverUrl: "ws://..." }` | Remote | Browser, Remote Client |

### request()

Send a command and wait for the response.

```typescript
const res = await agentx.request("container_create_request", {
  containerId: "my-container",
});
```

**Request Types:**

| Request Type               | Description           |
| -------------------------- | --------------------- |
| `container_create_request` | Create a container    |
| `container_get_request`    | Get container details |
| `container_list_request`   | List all containers   |
| `image_create_request`     | Create an agent image |
| `image_run_request`        | Run an agent          |
| `image_stop_request`       | Stop a running agent  |
| `image_list_request`       | List all images       |
| `message_send_request`     | Send message to agent |
| `agent_interrupt_request`  | Interrupt agent       |
| `agent_destroy_request`    | Destroy an agent      |

### on()

Subscribe to events by type.

```typescript
// Subscribe to specific event type
const unsubscribe = agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

// Subscribe to all events
agentx.on("*", (e) => {
  console.log(e.type, e.data);
});

// Unsubscribe
unsubscribe();
```

**Common Event Types:**

| Event Type              | Category | Description              |
| ----------------------- | -------- | ------------------------ |
| `text_delta`            | stream   | Incremental text output  |
| `message_start`         | stream   | Message streaming begins |
| `message_stop`          | stream   | Message streaming ends   |
| `tool_use_start`        | stream   | Tool call starting       |
| `tool_result`           | stream   | Tool result received     |
| `conversation_start`    | state    | Conversation started     |
| `conversation_thinking` | state    | Agent is thinking        |
| `conversation_end`      | state    | Conversation ended       |
| `assistant_message`     | message  | Complete assistant reply |

### onCommand()

Subscribe to command events with full type safety.

```typescript
agentx.onCommand("container_create_response", (e) => {
  console.log("Container created:", e.data.containerId);
});
```

### listen() (Local Mode Only)

Start WebSocket server for remote clients.

```typescript
await agentx.listen(5200);
// Or with custom host
await agentx.listen(5200, "0.0.0.0");
```

### dispose()

Release all resources.

```typescript
await agentx.dispose();
```

## Agent Definition

Use `defineAgent()` to define agent behavior:

```typescript
import { defineAgent, createAgentX } from "agentxjs";

const CodingAssistant = defineAgent({
  name: "CodingAssistant",
  description: "A helpful coding assistant",
  systemPrompt: "You are an expert programmer.",
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    },
  },
});

const agentx = await createAgentX({
  llm: { apiKey: process.env.ANTHROPIC_API_KEY! },
  defaultAgent: CodingAssistant,
});
```

## Type Guards

```typescript
import { isLocalConfig, isRemoteConfig } from "agentxjs";

const config = { serverUrl: "ws://localhost:5200" };

if (isRemoteConfig(config)) {
  // TypeScript knows this is RemoteConfig
  console.log(config.serverUrl);
}

if (isLocalConfig(config)) {
  // TypeScript knows this is LocalConfig
  console.log(config.llm?.apiKey);
}
```

## Browser Entry Point

The browser build only includes remote mode to minimize bundle size:

```typescript
// Browser entry automatically selected by bundlers
import { createAgentX } from "agentxjs";

// Local mode throws in browser
createAgentX(); // Error: Browser only supports remote mode

// Remote mode works
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
});
```

## Documentation

For full documentation, see:

- [agentxjs Package Documentation](../../docs/packages/agentx.md)
- [Event System](../../docs/concepts/event-system.md)
- [Lifecycle Management](../../docs/concepts/lifecycle.md)
- [Architecture Overview](../../docs/concepts/overview.md)

## License

MIT
