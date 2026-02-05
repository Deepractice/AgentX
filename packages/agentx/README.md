# agentxjs

Unified AgentX Client SDK for building AI agent applications. Supports two modes of operation:

- **Local mode** -- runs an embedded runtime with a direct LLM driver, no server required.
- **Remote mode** -- connects to an AgentX server over WebSocket using JSON-RPC.

Both modes expose the same `AgentX` interface, so application code is portable between local and remote deployments.

## Installation

```bash
bun add agentxjs
```

## Quick Start

### Local Mode

Run agents directly in your process. Requires an LLM API key.

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  apiKey: process.env.ANTHROPIC_API_KEY,
  provider: "anthropic",
});

// Create a container to organize images and agents
await agentx.containers.create("my-app");

// Create an image (agent blueprint)
const { record: image } = await agentx.images.create({
  containerId: "my-app",
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});

// Create an agent from the image
const { agentId } = await agentx.agents.create({ imageId: image.imageId });

// Listen for streaming text
agentx.on("text_delta", (e) => process.stdout.write(e.data.text));

// Send a message
await agentx.sessions.send(agentId, "Hello!");
```

### Remote Mode

Connect to a running AgentX server over WebSocket. The server handles LLM calls.

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
});

// The same AgentX interface is available
await agentx.containers.create("my-app");
const { record: image } = await agentx.images.create({
  containerId: "my-app",
  systemPrompt: "You are a helpful assistant.",
});
const { agentId } = await agentx.agents.create({ imageId: image.imageId });

agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
await agentx.sessions.send(agentId, "Hello!");
```

## Mode Detection

`createAgentX` automatically selects the mode based on the config you provide:

| Config field      | Mode     | Description                              |
|-------------------|----------|------------------------------------------|
| `serverUrl`       | Remote   | Connects to an AgentX WebSocket server   |
| `apiKey`          | Local    | Starts an embedded runtime with a driver |
| `createDriver`    | Local    | Uses a custom driver factory             |
| `customPlatform`  | Local    | Uses a custom AgentXPlatform             |

If none of these fields are present, `createAgentX` throws an error.

## Configuration

### AgentXConfig

```typescript
interface AgentXConfig {
  // ----- Local Mode -----
  apiKey?: string;          // LLM provider API key
  provider?: LLMProvider;   // Provider identifier (default: "anthropic")
  model?: string;           // Model ID (e.g., "claude-sonnet-4-20250514")
  baseUrl?: string;         // Custom API endpoint for proxies or private deployments
  dataPath?: string;        // Storage path (default: ":memory:" for in-memory)
  createDriver?: CreateDriver;      // Advanced: custom driver factory
  customPlatform?: AgentXPlatform;   // Advanced: custom platform

  // ----- Remote Mode -----
  serverUrl?: string;       // WebSocket server URL
  headers?: MaybeAsync<Record<string, string>>;   // Auth headers
  context?: MaybeAsync<Record<string, unknown>>;   // Business context

  // ----- Common -----
  timeout?: number;         // Request timeout in ms (default: 30000)
  debug?: boolean;          // Enable debug logging
  autoReconnect?: boolean;  // Reconnect on connection loss (default: true, remote only)
}
```

### Local Mode Fields

| Field            | Type            | Default        | Description                                       |
|------------------|-----------------|----------------|---------------------------------------------------|
| `apiKey`         | `string`        | --             | API key for the LLM provider                      |
| `provider`       | `LLMProvider`   | `"anthropic"`  | Which LLM provider to use                         |
| `model`          | `string`        | --             | Model identifier to use                           |
| `baseUrl`        | `string`        | --             | Custom base URL for the LLM API                   |
| `dataPath`       | `string`        | `":memory:"`   | Path for SQLite persistence, or `:memory:`        |
| `createDriver`   | `CreateDriver`  | --             | Override the default MonoDriver with a custom one  |
| `customPlatform` | `AgentXPlatform` | --            | Override the default NodePlatform                  |

### Remote Mode Fields

| Field            | Type                                    | Default   | Description                                        |
|------------------|-----------------------------------------|-----------|----------------------------------------------------|
| `serverUrl`      | `string`                                | --        | WebSocket URL of the AgentX server                 |
| `headers`        | `MaybeAsync<Record<string, string>>`    | --        | Authentication headers (static, dynamic, or async) |
| `context`        | `MaybeAsync<Record<string, unknown>>`   | --        | Business context injected into all requests        |
| `autoReconnect`  | `boolean`                               | `true`    | Automatically reconnect on connection loss         |

### Common Fields

| Field     | Type      | Default | Description              |
|-----------|-----------|---------|--------------------------|
| `timeout` | `number`  | `30000` | Request timeout in ms    |
| `debug`   | `boolean` | --      | Enable debug logging     |

## LLMProvider

The `LLMProvider` type defines supported LLM providers for local mode:

```typescript
type LLMProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "mistral";
```

## AgentX Interface

The `AgentX` interface is the unified API returned by `createAgentX`. It is identical in both local and remote modes.

### Properties

| Property    | Type       | Description                           |
|-------------|------------|---------------------------------------|
| `connected` | `boolean`  | Whether the client is connected       |
| `events`    | `EventBus` | Internal event bus for subscriptions  |

### Container Operations

Containers are organizational units that group images and agents.

```typescript
// Create or get a container
const { containerId } = await agentx.containers.create("my-app");

// Check if a container exists
const { exists } = await agentx.containers.get("my-app");

// List all containers
const { containerIds } = await agentx.containers.list();
```

### Image Operations

Images are agent blueprints that define the system prompt and configuration. They follow the Docker analogy: Image is to Container as Definition is to Running Instance.

```typescript
// Create an image
const { record } = await agentx.images.create({
  containerId: "my-app",
  name: "Code Reviewer",
  description: "Reviews pull requests",
  systemPrompt: "You are an expert code reviewer.",
  mcpServers: { /* optional MCP server config */ },
});

// Get an image by ID
const { record: image } = await agentx.images.get(imageId);

// List images, optionally filtered by container
const { records } = await agentx.images.list("my-app");
const { records: allImages } = await agentx.images.list();

// Delete an image
await agentx.images.delete(imageId);
```

### Agent Operations

Agents are running instances created from images.

```typescript
// Create an agent from an image
const { agentId, sessionId } = await agentx.agents.create({
  imageId: image.imageId,
  agentId: "optional-custom-id",
});

// Get agent info
const { agent, exists } = await agentx.agents.get(agentId);

// List agents, optionally filtered by container
const { agents } = await agentx.agents.list("my-app");

// Destroy an agent
await agentx.agents.destroy(agentId);
```

### Message Operations

```typescript
// Send a text message
await agentx.sessions.send(agentId, "Explain this code.");

// Send structured content (multipart)
await agentx.sessions.send(agentId, [
  { type: "text", text: "What is in this image?" },
  { type: "image", source: { type: "url", url: "https://example.com/img.png" } },
]);

// Interrupt a response in progress
await agentx.sessions.interrupt(agentId);
```

### Event Subscription

Subscribe to stream events emitted by agents. Events are delivered through an internal `EventBus`.

```typescript
// Subscribe to a specific event type
const unsub = agentx.on("text_delta", (event) => {
  process.stdout.write(event.data.text);
});

// Subscribe to all events
const unsub2 = agentx.onAny((event) => {
  console.log(event.type, event.data);
});

// Subscribe to a session's events (remote mode, usually automatic)
agentx.subscribe(sessionId);

// Unsubscribe
unsub();
unsub2();
```

**Stream event types:**

| Event              | Description                                  |
|--------------------|----------------------------------------------|
| `message_start`    | Assistant message begins                     |
| `text_delta`       | Incremental text chunk                       |
| `tool_use_start`   | Tool call begins                             |
| `input_json_delta` | Incremental tool input JSON                  |
| `tool_result`      | Tool execution result                        |
| `message_stop`     | Assistant message complete                   |
| `error`            | Error occurred                               |

### Lifecycle

```typescript
// Disconnect from server (remote mode; no-op in local mode)
await agentx.disconnect();

// Dispose and clean up all resources
await agentx.dispose();
```

## Presentation API

The `Presentation` class provides a high-level, UI-friendly wrapper around the AgentX client. It aggregates raw stream events into a structured conversation state, making it straightforward to render chat interfaces.

### Creating a Presentation

```typescript
const presentation = agentx.presentations.create(agentId, {
  onUpdate: (state) => {
    // Called on every state change
    renderUI(state);
  },
  onError: (error) => {
    console.error("Agent error:", error.message);
  },
});
```

### Sending Messages

```typescript
// Sends the message and adds the user conversation to state automatically
await presentation.send("What is the weather today?");
```

### Reading State

```typescript
const state = presentation.getState();
// state.conversations  - array of completed conversations
// state.streaming      - current streaming assistant conversation (or null)
// state.status         - "idle" | "thinking" | "responding" | "executing"
```

### Subscribing to Updates

```typescript
// onUpdate immediately fires with the current state, then on every change
const unsub = presentation.onUpdate((state) => {
  renderConversations(state.conversations);

  if (state.streaming) {
    renderStreaming(state.streaming);
  }
});

// Unsubscribe later
unsub();
```

### Interrupting and Resetting

```typescript
// Interrupt the current response
await presentation.interrupt();

// Reset to initial empty state
presentation.reset();
```

### Cleanup

```typescript
// Unsubscribe from events and clear handlers
presentation.dispose();
```

### PresentationState

```typescript
interface PresentationState {
  conversations: Conversation[];                // Completed conversations
  streaming: AssistantConversation | null;       // Active streaming response
  status: "idle" | "thinking" | "responding" | "executing";
}
```

### Conversation Types

```typescript
// A user message
interface UserConversation {
  role: "user";
  blocks: Block[];
}

// An assistant response (may be streaming)
interface AssistantConversation {
  role: "assistant";
  blocks: Block[];
  isStreaming: boolean;
}

// An error
interface ErrorConversation {
  role: "error";
  message: string;
}
```

### Block Types

Blocks are the content units within a conversation:

```typescript
// Plain text
interface TextBlock {
  type: "text";
  content: string;
}

// Tool call with status tracking
interface ToolBlock {
  type: "tool";
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  status: "pending" | "running" | "completed" | "error";
}

// Image
interface ImageBlock {
  type: "image";
  url: string;
  alt?: string;
}
```

### Presentation Reducer

For advanced use cases (custom state management, Redux integration, etc.), the raw `presentationReducer` function is exported:

```typescript
import { presentationReducer, createInitialState, addUserConversation } from "agentxjs";

let state = createInitialState();

// Manually add a user message
state = addUserConversation(state, "Hello");

// Apply a stream event
state = presentationReducer(state, event);
```

The reducer is a pure function: `(PresentationState, BusEvent) => PresentationState`.

## Dynamic Headers and Context

Remote mode supports static, dynamic, and async values for `headers` and `context` through the `MaybeAsync<T>` type:

```typescript
type MaybeAsync<T> = T | (() => T) | (() => Promise<T>);
```

### Static

```typescript
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: { Authorization: "Bearer sk-xxx" },
  context: { userId: "user-123", tenantId: "tenant-abc" },
});
```

### Dynamic (evaluated on each connection/request)

```typescript
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: () => ({
    Authorization: `Bearer ${getToken()}`,
  }),
  context: () => ({
    userId: getCurrentUser().id,
    permissions: getUserPermissions(),
  }),
});
```

### Async Dynamic

```typescript
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: async () => ({
    Authorization: `Bearer ${await refreshToken()}`,
  }),
  context: async () => ({
    userId: await fetchUserId(),
    sessionId: await resolveSession(),
  }),
});
```

**Platform notes:**

- **Node.js** -- headers are sent during the WebSocket handshake.
- **Browsers** -- headers are sent as a first authentication message after connecting (WebSocket API does not support custom headers).

## Response Types

All operations return a response object extending `BaseResponse`:

```typescript
interface BaseResponse {
  requestId: string;
  error?: string;
}
```

| Response Type             | Additional Fields                                      |
|---------------------------|--------------------------------------------------------|
| `ContainerCreateResponse` | `containerId`                                          |
| `ContainerGetResponse`    | `containerId`, `exists`                                |
| `ContainerListResponse`   | `containerIds`                                         |
| `ImageCreateResponse`     | `record` (ImageRecord)                                 |
| `ImageGetResponse`        | `record` (ImageRecord or null)                         |
| `ImageListResponse`       | `records` (ImageRecord[])                              |
| `AgentCreateResponse`     | `agentId`, `imageId`, `containerId`, `sessionId`       |
| `AgentGetResponse`        | `agent` (AgentInfo or null), `exists`                  |
| `AgentListResponse`       | `agents` (AgentInfo[])                                 |
| `MessageSendResponse`     | `agentId`                                              |

## Full Example

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  // Initialize in local mode
  const agentx = await createAgentX({
    apiKey: process.env.ANTHROPIC_API_KEY,
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  });

  // Set up container and image
  await agentx.containers.create("demo");
  const { record: image } = await agentx.images.create({
    containerId: "demo",
    name: "Chat Assistant",
    systemPrompt: "You are a friendly assistant. Be concise.",
  });

  // Create agent
  const { agentId } = await agentx.agents.create({ imageId: image.imageId });

  // Use Presentation for structured state management
  const presentation = agentx.presentations.create(agentId, {
    onUpdate: (state) => {
      if (state.status === "responding" && state.streaming) {
        const textBlocks = state.streaming.blocks.filter((b) => b.type === "text");
        const lastText = textBlocks[textBlocks.length - 1];
        if (lastText && lastText.type === "text") {
          process.stdout.write(`\r${lastText.content}`);
        }
      }
      if (state.status === "idle" && state.conversations.length > 0) {
        console.log("\n--- Response complete ---");
      }
    },
  });

  await presentation.send("What are the three laws of robotics?");

  // Cleanup
  presentation.dispose();
  await agentx.dispose();
}

main();
```

## License

MIT
