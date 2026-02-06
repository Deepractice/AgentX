# agentxjs

Client SDK for building AI agent applications. Supports local (embedded) and remote (WebSocket) modes through a single unified API.

## Overview

`agentxjs` is the main SDK that developers use directly. It auto-detects the mode based on config: provide `apiKey` for local mode (no server needed), or `serverUrl` for remote mode (connects to an AgentX server over WebSocket).

## Quick Start

### Local Mode (Embedded)

Runs agents directly in your process. No server required.

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  apiKey: process.env.ANTHROPIC_API_KEY,
  provider: "anthropic",
});

await agentx.containers.create("my-app");

const { record: image } = await agentx.images.create({
  containerId: "my-app",
  systemPrompt: "You are a helpful assistant.",
});

const { agentId } = await agentx.agents.create({ imageId: image.imageId });

agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
await agentx.sessions.send(agentId, "Hello!");
```

### Remote Mode (WebSocket)

Connects to a running AgentX server. Same API surface.

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
});

// Identical API as local mode
await agentx.containers.create("my-app");
const { record: image } = await agentx.images.create({
  containerId: "my-app",
  systemPrompt: "You are a helpful assistant.",
});
const { agentId } = await agentx.agents.create({ imageId: image.imageId });

agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
await agentx.sessions.send(agentId, "Hello!");
```

## API Reference

### `createAgentX(config: AgentXConfig): Promise<AgentX>`

Creates an AgentX client. Mode is auto-detected:

| Config field | Mode | Trigger |
|---|---|---|
| `serverUrl` | Remote | Connects via WebSocket |
| `apiKey` | Local | Starts embedded runtime with MonoDriver |
| `createDriver` | Local | Uses custom driver factory |
| `customPlatform` | Local | Uses custom platform |

### AgentX Interface

```typescript
interface AgentX {
  readonly connected: boolean;
  readonly events: EventBus;

  // Namespaced operations
  readonly containers: ContainerNamespace;
  readonly images: ImageNamespace;
  readonly agents: AgentNamespace;
  readonly sessions: SessionNamespace;
  readonly presentations: PresentationNamespace;

  // Event subscription
  on<T extends string>(type: T, handler: BusEventHandler): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;
  subscribe(sessionId: string): void;

  // Lifecycle
  disconnect(): Promise<void>;
  dispose(): Promise<void>;
}
```

### Namespace Operations

**containers**:
- `create(containerId: string): Promise<ContainerCreateResponse>`
- `get(containerId: string): Promise<ContainerGetResponse>`
- `list(): Promise<ContainerListResponse>`

**images**:
- `create(params: { containerId, name?, description?, systemPrompt?, mcpServers? }): Promise<ImageCreateResponse>`
- `get(imageId: string): Promise<ImageGetResponse>`
- `list(containerId?: string): Promise<ImageListResponse>`
- `delete(imageId: string): Promise<BaseResponse>`

**agents**:
- `create(params: { imageId, agentId? }): Promise<AgentCreateResponse>`
- `get(agentId: string): Promise<AgentGetResponse>`
- `list(containerId?: string): Promise<AgentListResponse>`
- `destroy(agentId: string): Promise<BaseResponse>`

**sessions**:
- `send(agentId: string, content: string | unknown[]): Promise<MessageSendResponse>`
- `interrupt(agentId: string): Promise<BaseResponse>`

**presentations**:
- `create(agentId: string, options?: PresentationOptions): Presentation`

### Stream Events

| Event | Data | Description |
|-------|------|-------------|
| `message_start` | `{ messageId, model }` | Response begins |
| `text_delta` | `{ text }` | Incremental text chunk |
| `tool_use_start` | `{ toolCallId, toolName }` | Tool call begins |
| `input_json_delta` | `{ partialJson }` | Incremental tool input |
| `tool_result` | `{ toolCallId, result }` | Tool execution result |
| `message_stop` | `{ stopReason }` | Response complete |
| `error` | `{ message }` | Error occurred |

### Presentation API

High-level UI state management. Aggregates raw stream events into a structured conversation state.

```typescript
const presentation = agentx.presentations.create(agentId, {
  onUpdate: (state: PresentationState) => renderUI(state),
  onError: (error) => console.error(error),
});

await presentation.send("What is the weather?");
const state = presentation.getState();
// state.conversations -- completed conversations
// state.streaming     -- current streaming response (or null)
// state.status        -- "idle" | "thinking" | "responding" | "executing"

presentation.dispose();
```

**PresentationState**:

```typescript
interface PresentationState {
  conversations: Conversation[];                  // UserConversation | AssistantConversation | ErrorConversation
  streaming: AssistantConversation | null;
  status: "idle" | "thinking" | "responding" | "executing";
}
```

**Block types**: `TextBlock { type: "text", content }`, `ToolBlock { type: "tool", toolName, status, ... }`, `ImageBlock { type: "image", url }`

For custom state management, use the exported reducer:

```typescript
import { presentationReducer, createInitialState, addUserConversation } from "agentxjs";

let state = createInitialState();
state = addUserConversation(state, "Hello");
state = presentationReducer(state, event); // pure function
```

## Configuration

### AgentXConfig

```typescript
interface AgentXConfig {
  // --- Local Mode ---
  apiKey?: string;                    // LLM provider API key
  provider?: LLMProvider;             // default: "anthropic"
  model?: string;                     // e.g. "claude-sonnet-4-20250514"
  baseUrl?: string;                   // custom API endpoint
  dataPath?: string;                  // default: ":memory:"
  createDriver?: CreateDriver;        // custom driver factory (advanced)
  customPlatform?: AgentXPlatform;    // custom platform (advanced)

  // --- Remote Mode ---
  serverUrl?: string;                 // WebSocket URL
  headers?: MaybeAsync<Record<string, string>>;    // auth headers
  context?: MaybeAsync<Record<string, unknown>>;   // business context

  // --- Common ---
  timeout?: number;                   // default: 30000 ms
  debug?: boolean;
  autoReconnect?: boolean;            // default: true (remote only)
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | -- | LLM provider API key (triggers local mode) |
| `provider` | `LLMProvider` | `"anthropic"` | `"anthropic"` \| `"openai"` \| `"google"` \| `"xai"` \| `"deepseek"` \| `"mistral"` |
| `model` | `string` | provider default | Model identifier |
| `baseUrl` | `string` | -- | Custom API endpoint |
| `dataPath` | `string` | `":memory:"` | SQLite path or `:memory:` |
| `serverUrl` | `string` | -- | WebSocket URL (triggers remote mode) |
| `headers` | `MaybeAsync<Record<string, string>>` | -- | Static, dynamic, or async auth headers |
| `context` | `MaybeAsync<Record<string, unknown>>` | -- | Business context (userId, tenantId, etc.) |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `debug` | `boolean` | `false` | Enable debug logging |
| `autoReconnect` | `boolean` | `true` | Auto reconnect on connection loss (remote only) |

### MaybeAsync

`headers` and `context` accept static values, functions, or async functions:

```typescript
type MaybeAsync<T> = T | (() => T) | (() => Promise<T>);

// Static
headers: { Authorization: "Bearer sk-xxx" }

// Dynamic
headers: () => ({ Authorization: `Bearer ${getToken()}` })

// Async
headers: async () => ({ Authorization: `Bearer ${await refreshToken()}` })
```

### Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Default API key for Anthropic provider |
