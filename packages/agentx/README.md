# agentxjs

Client SDK for building AI agent applications. Supports local, remote, and server modes through a unified fluent API.

## Quick Start

### Local Mode (Embedded)

Runs agents directly in your process. No server required.

```typescript
import { createAgentX } from "agentxjs";
import { nodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";

const createDriver = (config) => createMonoDriver({
  ...config,
  apiKey: process.env.ANTHROPIC_API_KEY,
  options: { provider: "anthropic" },
});

const ax = createAgentX(nodePlatform({ createDriver }));

await ax.container.create("my-app");

const { record: image } = await ax.image.create({
  containerId: "my-app",
  systemPrompt: "You are a helpful assistant.",
});

const { agentId } = await ax.agent.create({ imageId: image.imageId });

ax.on("text_delta", (e) => process.stdout.write(e.data.text));
await ax.session.send(agentId, "Hello!");
```

### Remote Mode (WebSocket Client)

Connects to a running AgentX server. Same API surface.

```typescript
import { createAgentX } from "agentxjs";

const ax = createAgentX();
const client = await ax.connect("ws://localhost:5200");

await client.container.create("my-app");
const { record: image } = await client.image.create({
  containerId: "my-app",
  systemPrompt: "You are a helpful assistant.",
});
const { agentId } = await client.agent.create({ imageId: image.imageId });

client.on("text_delta", (e) => process.stdout.write(e.data.text));
await client.session.send(agentId, "Hello!");
```

### Server Mode

Start an AgentX WebSocket server for remote clients.

```typescript
import { createAgentX } from "agentxjs";
import { nodePlatform } from "@agentxjs/node-platform";

const ax = createAgentX(nodePlatform({ createDriver }));
const server = await ax.serve({ port: 5200 });
```

## API Reference

### `createAgentX(config?): AgentXBuilder`

Creates an AgentX builder. Synchronous — returns immediately.

- **With config** (PlatformConfig): Local mode + `connect()` + `serve()`
- **Without config**: Only `connect()` available

### AgentX Interface

```typescript
interface AgentX {
  readonly connected: boolean;
  readonly events: EventBus;

  // Namespaced operations
  readonly container: ContainerNamespace;
  readonly image: ImageNamespace;
  readonly agent: AgentNamespace;
  readonly session: SessionNamespace;
  readonly presentation: PresentationNamespace;

  // Universal RPC
  rpc<T = unknown>(method: string, params?: unknown): Promise<T>;

  // Event subscription
  on<T extends string>(type: T, handler: BusEventHandler): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;
  subscribe(sessionId: string): void;

  // Error handling
  onError(handler: (error: AgentXError) => void): Unsubscribe;

  // Lifecycle
  disconnect(): Promise<void>;
  dispose(): Promise<void>;
}

interface AgentXBuilder extends AgentX {
  connect(serverUrl: string, options?: ConnectOptions): Promise<AgentX>;
  serve(config?: ServeConfig): Promise<AgentXServer>;
}
```

### Namespace Operations

**container**:

- `create(containerId: string): Promise<ContainerCreateResponse>`
- `get(containerId: string): Promise<ContainerGetResponse>`
- `list(): Promise<ContainerListResponse>`

**image**:

- `create(params: { containerId, name?, description?, systemPrompt?, mcpServers?, customData? }): Promise<ImageCreateResponse>`
- `get(imageId: string): Promise<ImageGetResponse>`
- `list(containerId?: string): Promise<ImageListResponse>`
- `update(imageId: string, updates: { name?, description?, customData? }): Promise<ImageUpdateResponse>`
- `delete(imageId: string): Promise<BaseResponse>`
- `getMessages(imageId: string): Promise<Message[]>`

**agent**:

- `create(params: { imageId, agentId? }): Promise<AgentCreateResponse>`
- `get(agentId: string): Promise<AgentGetResponse>`
- `list(containerId?: string): Promise<AgentListResponse>`
- `destroy(agentId: string): Promise<BaseResponse>`

**session**:

- `send(agentId: string, content: string | unknown[]): Promise<MessageSendResponse>`
- `interrupt(agentId: string): Promise<BaseResponse>`
- `getMessages(agentId: string): Promise<Message[]>`

**presentation**:

- `create(agentId: string, options?: PresentationOptions): Promise<Presentation>`

### Universal RPC

Transport-agnostic JSON-RPC entry point. Works in all modes — local dispatches to CommandHandler, remote forwards via WebSocket.

```typescript
// Equivalent to ax.container.create("default")
await ax.rpc("container.create", { containerId: "default" });

// Equivalent to ax.image.list()
const { records } = await ax.rpc<{ records: ImageRecord[] }>("image.list");

// Useful for custom transport (e.g. Cloudflare Workers/DO)
const response = await ax.rpc(request.method, request.params);
```

### Error Handling

Top-level error handler — receives structured `AgentXError` from all layers (driver, persistence, connection, runtime). Independent of stream events and Presentation API.

```typescript
import { AgentXError } from "agentxjs";

ax.onError((error) => {
  console.error(`[${error.category}] ${error.code}: ${error.message}`);

  if (error.code === "CIRCUIT_OPEN") {
    // Too many consecutive LLM failures — stop sending requests
  }

  if (error.code === "PERSISTENCE_FAILED") {
    // Message failed to save — conversation continues but data may be lost
  }

  if (!error.recoverable) {
    // Fatal error — consider restarting the agent
  }
});
```

**AgentXError properties:**

| Property      | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `code`        | string   | Error code (e.g. `PERSISTENCE_FAILED`) |
| `category`    | string   | `"driver"` \| `"persistence"` \| `"connection"` \| `"runtime"` |
| `recoverable` | boolean  | Whether the caller should retry      |
| `context`     | object   | `{ agentId?, sessionId?, imageId? }` |
| `cause`       | Error?   | Original error                       |

**Built-in circuit breaker:** After 5 consecutive driver failures, the circuit opens and rejects new requests. After 30s cooldown, one probe request is allowed through. Success closes the circuit.

### Stream Events

| Event              | Data                       | Description            |
| ------------------ | -------------------------- | ---------------------- |
| `message_start`    | `{ messageId, model }`     | Response begins        |
| `text_delta`       | `{ text }`                 | Incremental text chunk |
| `tool_use_start`   | `{ toolCallId, toolName }` | Tool call begins       |
| `input_json_delta` | `{ partialJson }`          | Incremental tool input |
| `tool_result`      | `{ toolCallId, result }`   | Tool execution result  |
| `message_stop`     | `{ stopReason }`           | Response complete      |
| `error`            | `{ message }`              | Error occurred         |

### Presentation API

High-level UI state management. Aggregates raw stream events into structured conversation state.

```typescript
const presentation = await ax.presentation.create(agentId, {
  onUpdate: (state) => {
    // state.conversations — completed messages (includes history)
    // state.streaming — current streaming response (or null)
    // state.status — "idle" | "thinking" | "responding" | "executing"
    renderUI(state);
  },
  onError: (error) => console.error(error),
});

await presentation.send("What is the weather?");
const state = presentation.getState();
presentation.dispose();
```

For custom state management, use the exported reducer:

```typescript
import { presentationReducer, createInitialState, addUserConversation } from "agentxjs";

let state = createInitialState();
state = addUserConversation(state, "Hello");
state = presentationReducer(state, event); // pure function
```
