# @agentxjs/types

Type definitions for the AgentX AI Agent platform. This package provides zero-dependency TypeScript types shared across all AgentX packages.

## Installation

```bash
bun add @agentxjs/types
```

## Package Overview

`@agentxjs/types` defines the core type system for AgentX, including:

- **Event Types**: Unified event system with 4-layer architecture
- **Message Types**: Role-based message model with rich content support
- **Agent Types**: Agent lifecycle and state management
- **Runtime Types**: Container, Session, and persistence
- **Command Types**: Request/Response patterns for API operations
- **Network Types**: Channel abstraction for client-server communication
- **Queue Types**: Reliable event delivery with persistence

## Package Structure

```
@agentxjs/types
|
|-- /agent          AgentEngine domain (independent, testable)
|   |-- AgentEngine, AgentDriver, AgentPresenter
|   |-- AgentState, AgentError, AgentOutput
|   |-- Message types (UserMessage, AssistantMessage, etc.)
|   +-- Event types (StreamEvent, StateEvent, MessageEvent, TurnEvent)
|
|-- /runtime        Runtime domain (Container, Session, Sandbox)
|   |-- Runtime, Agent, Container, AgentImage
|   +-- /internal   LLM, Sandbox, MCP, Environment, Persistence
|
|-- /event          SystemEvent and all runtime events
|   |-- SystemEvent (source, category, intent, context)
|   |-- DriveableEvent, ConnectionEvent
|   +-- CommandEvent (request/response)
|
|-- /agentx         AgentX high-level API types
|   +-- AgentX, AgentDefinition, Config types
|
|-- /network        Network channel abstraction
|   +-- ChannelServer, ChannelClient, ChannelConnection
|
|-- /queue          Event queue types
|   +-- EventQueue, QueueEntry
|
+-- /common         Shared infrastructure (Logger)
```

## Submodule Imports

```typescript
// AgentEngine domain
import type { AgentEngine, AgentDriver, AgentState } from "@agentxjs/types/agent";

// Runtime domain
import type { Runtime, Agent, Container, AgentImage } from "@agentxjs/types/runtime";

// Event system
import type { SystemEvent, DriveableEvent } from "@agentxjs/types/event";

// High-level API
import type { AgentX, AgentDefinition } from "@agentxjs/types/agentx";

// Network
import type { ChannelServer, ChannelClient } from "@agentxjs/types/network";

// Queue
import type { EventQueue, QueueEntry } from "@agentxjs/types/queue";
```

---

## Event Types

AgentX uses a 4-layer event architecture for fine-grained event handling.

### SystemEvent (Base)

All events in the system extend `SystemEvent`:

```typescript
interface SystemEvent<
  T extends string = string,
  D = unknown,
  S extends EventSource = EventSource,
  C extends EventCategory = EventCategory,
  I extends EventIntent = EventIntent,
> {
  /** Event type identifier (e.g., "text_delta", "session_saved") */
  readonly type: T;

  /** Event timestamp (Unix milliseconds) */
  readonly timestamp: number;

  /** Event payload data */
  readonly data: D;

  /** Event source - where the event originated */
  readonly source: S;

  /** Event category - fine-grained classification */
  readonly category: C;

  /** Event intent - what the event represents */
  readonly intent: I;

  /** Event context - scope information (optional) */
  readonly context?: EventContext;

  /** Whether to broadcast this event to external clients */
  readonly broadcastable?: boolean;
}
```

### EventSource

```typescript
type EventSource =
  | "environment" // External world (Claude API, Network)
  | "agent" // Agent internal
  | "session" // Session operations
  | "container" // Container operations
  | "sandbox" // Sandbox resources (Workspace, MCP)
  | "command"; // Command request/response (API operations)
```

### EventIntent

```typescript
type EventIntent =
  | "request" // Request to perform action
  | "result" // Result of completed action
  | "notification"; // State change notification
```

### EventCategory

```typescript
type EventCategory =
  // Environment categories
  | "stream" // Streaming output from LLM
  | "connection" // Network connection status
  // Agent categories
  | "state" // State transitions
  | "message" // Complete messages
  | "turn" // Conversation turns
  | "error" // Errors
  // Session categories
  | "lifecycle" // Creation/destruction
  | "persist" // Persistence operations
  | "action" // User actions (resume, fork)
  // Sandbox categories
  | "workdir" // File operations
  | "mcp" // MCP tool operations
  // Command categories
  | "request" // Request to perform action
  | "response"; // Response with result
```

### EventContext

```typescript
interface EventContext {
  containerId?: string; // Container ID (isolation boundary)
  imageId?: string; // Image ID (persistent conversation identity)
  agentId?: string; // Agent ID (if event is agent-scoped)
  sessionId?: string; // Session ID (if event is session-scoped)
  turnId?: string; // Turn ID (for correlating events within a single turn)
  correlationId?: string; // Correlation ID (for request-response tracking)
}
```

---

## Stream Events

Real-time incremental events from LLM streaming.

```typescript
// Message lifecycle
interface MessageStartEvent {
  type: "message_start";
  data: { messageId: string; model: string };
}

interface MessageDeltaEvent {
  type: "message_delta";
  data: { usage?: { inputTokens: number; outputTokens: number } };
}

interface MessageStopEvent {
  type: "message_stop";
  data: { stopReason?: StopReason };
}

// Text content
interface TextDeltaEvent {
  type: "text_delta";
  data: { text: string };
}

// Tool use
interface ToolUseStartEvent {
  type: "tool_use_start";
  data: { toolCallId: string; toolName: string };
}

interface InputJsonDeltaEvent {
  type: "input_json_delta";
  data: { partialJson: string };
}

interface ToolUseStopEvent {
  type: "tool_use_stop";
  data: { toolCallId: string; toolName: string; input: Record<string, unknown> };
}

interface ToolResultEvent {
  type: "tool_result";
  data: { toolCallId: string; result: unknown; isError?: boolean };
}

// Stop reason
type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

// Union type
type StreamEvent =
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | TextDeltaEvent
  | ToolUseStartEvent
  | InputJsonDeltaEvent
  | ToolUseStopEvent
  | ToolResultEvent;
```

---

## State Events

Events that trigger AgentState transitions.

```typescript
// Conversation events
interface ConversationQueuedEvent {
  type: "conversation_queued";
  data: { messageId: string };
}

interface ConversationStartEvent {
  type: "conversation_start";
  data: { messageId: string };
}

interface ConversationThinkingEvent {
  type: "conversation_thinking";
  data: Record<string, never>;
}

interface ConversationRespondingEvent {
  type: "conversation_responding";
  data: Record<string, never>;
}

interface ConversationEndEvent {
  type: "conversation_end";
  data: { reason: "completed" | "interrupted" | "error" };
}

interface ConversationInterruptedEvent {
  type: "conversation_interrupted";
  data: { reason: string };
}

// Tool events
interface ToolPlannedEvent {
  type: "tool_planned";
  data: { toolId: string; toolName: string };
}

interface ToolExecutingEvent {
  type: "tool_executing";
  data: { toolId: string; toolName: string; input: Record<string, unknown> };
}

interface ToolCompletedEvent {
  type: "tool_completed";
  data: { toolId: string; toolName: string; result: unknown };
}

interface ToolFailedEvent {
  type: "tool_failed";
  data: { toolId: string; toolName: string; error: string };
}

// Error events
interface ErrorOccurredEvent {
  type: "error_occurred";
  data: { code: string; message: string; recoverable: boolean; category?: string };
}

// Union type
type AgentStateEvent =
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  | ToolPlannedEvent
  | ToolExecutingEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  | ErrorOccurredEvent;
```

---

## Message Events

Complete message events assembled from stream events.

```typescript
interface UserMessageEvent {
  type: "user_message";
  data: UserMessage;
}

interface AssistantMessageEvent {
  type: "assistant_message";
  data: AssistantMessage;
}

interface ToolCallMessageEvent {
  type: "tool_call_message";
  data: ToolCallMessage;
}

interface ToolResultMessageEvent {
  type: "tool_result_message";
  data: ToolResultMessage;
}

interface ErrorMessageEvent {
  type: "error_message";
  data: ErrorMessage;
}

// Union type
type AgentMessageEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;
```

---

## Turn Events

Turn-level events for analytics and billing.

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

interface TurnRequestEvent {
  type: "turn_request";
  data: {
    turnId: string;
    messageId: string;
    content: string;
    timestamp: number;
  };
}

interface TurnResponseEvent {
  type: "turn_response";
  data: {
    turnId: string;
    messageId: string;
    duration: number;
    usage?: TokenUsage;
    model?: string;
    stopReason?: string;
    timestamp: number;
  };
}

type AgentTurnEvent = TurnRequestEvent | TurnResponseEvent;
```

---

## Message Types

Role-based message system with rich, multi-modal content support.

### MessageRole

```typescript
type MessageRole = "user" | "assistant" | "tool" | "system" | "error";
```

### MessageSubtype

```typescript
type MessageSubtype = "user" | "assistant" | "tool-call" | "tool-result" | "error";
```

### UserMessage

```typescript
interface UserMessage {
  id: string;
  role: "user";
  subtype: "user";
  content: string | UserContentPart[];
  timestamp: number;
  parentId?: string;
}
```

### AssistantMessage

```typescript
interface AssistantMessage {
  id: string;
  role: "assistant";
  subtype: "assistant";
  content: string | Array<TextPart | ThinkingPart | FilePart>;
  timestamp: number;
  parentId?: string;
  usage?: TokenUsage;
}
```

### ToolCallMessage

```typescript
interface ToolCallMessage {
  id: string;
  role: "assistant";
  subtype: "tool-call";
  toolCall: ToolCallPart;
  timestamp: number;
  parentId?: string;
}
```

### ToolResultMessage

```typescript
interface ToolResultMessage {
  id: string;
  role: "tool";
  subtype: "tool-result";
  toolResult: ToolResultPart;
  toolCallId: string;
  timestamp: number;
}
```

### ErrorMessage

```typescript
interface ErrorMessage {
  id: string;
  role: "error";
  subtype: "error";
  content: string;
  errorCode?: string;
  timestamp: number;
  parentId?: string;
}
```

### Message Union

```typescript
type Message = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage | ErrorMessage;
```

---

## Content Parts

Fine-grained content types for building rich, multi-modal messages.

### TextPart

```typescript
interface TextPart {
  type: "text";
  text: string;
}
```

### ThinkingPart

```typescript
interface ThinkingPart {
  type: "thinking";
  reasoning: string;
  tokenCount?: number;
}
```

### ImagePart

```typescript
interface ImagePart {
  type: "image";
  data: string; // base64-encoded or URL
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  name?: string;
}
```

### FilePart

```typescript
interface FilePart {
  type: "file";
  data: string; // base64-encoded or URL
  mediaType: string; // IANA media type
  filename?: string;
}
```

### ToolCallPart

```typescript
interface ToolCallPart {
  type: "tool-call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}
```

### ToolResultPart

```typescript
interface ToolResultPart {
  type: "tool-result";
  id: string;
  name: string;
  output: ToolResultOutput;
}
```

### ToolResultOutput

```typescript
type ToolResultOutput =
  | { type: "text"; value: string }
  | { type: "json"; value: unknown }
  | { type: "error-text"; value: string }
  | { type: "error-json"; value: unknown }
  | { type: "execution-denied"; reason?: string }
  | { type: "content"; value: Array<TextPart | ImagePart | FilePart> };
```

### ContentPart Union

```typescript
type ContentPart = TextPart | ThinkingPart | ImagePart | FilePart | ToolCallPart | ToolResultPart;

type UserContentPart = TextPart | ImagePart | FilePart;
```

---

## Agent Types

### AgentEngine

The core event processing unit that coordinates Driver, MealyMachine, and Presenter.

```typescript
interface AgentEngine {
  readonly agentId: string;
  readonly createdAt: number;
  readonly state: AgentState;
  readonly messageQueue: MessageQueue;

  // Message handling
  receive(message: string | UserMessage): Promise<void>;
  handleStreamEvent(event: StreamEvent): void;

  // Event subscription
  on(handler: AgentOutputCallback): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  on(types: string[], handler: AgentOutputCallback): Unsubscribe;
  onStateChange(handler: StateChangeHandler): Unsubscribe;
  react(handlers: ReactHandlerMap): Unsubscribe;
  onReady(handler: () => void): Unsubscribe;
  onDestroy(handler: () => void): Unsubscribe;

  // Middleware
  use(middleware: AgentMiddleware): Unsubscribe;
  intercept(interceptor: AgentInterceptor): Unsubscribe;

  // Lifecycle
  interrupt(): void;
  destroy(): Promise<void>;
}
```

### AgentState

```typescript
type AgentState =
  | "idle" // Waiting for user input
  | "thinking" // LLM is thinking
  | "responding" // LLM is generating response
  | "planning_tool" // Generating tool call parameters
  | "awaiting_tool_result" // Waiting for tool execution result
  | "error"; // Error occurred during processing
```

### AgentError

```typescript
type AgentErrorCategory = "network" | "validation" | "system" | "business";

interface AgentError {
  category: AgentErrorCategory;
  code: string;
  message: string;
  recoverable: boolean;
  cause?: Error;
  context?: Record<string, unknown>;
}
```

### StateChange

```typescript
interface StateChange {
  prev: AgentState;
  current: AgentState;
}

type StateChangeHandler = (change: StateChange) => void;
```

---

## Runtime Types

### Agent (Runtime)

Complete runtime entity with LLM, Sandbox, Session, and lifecycle management.

```typescript
interface Agent {
  readonly agentId: string;
  readonly name: string;
  readonly containerId: string;
  readonly lifecycle: AgentLifecycle;
  readonly createdAt: number;

  // Interaction
  receive(content: string | UserContentPart[], requestId?: string): Promise<void>;
  interrupt(requestId?: string): void;

  // Lifecycle
  stop(): Promise<void>;
  resume(): Promise<void>;
  destroy(): Promise<void>;
}
```

### AgentLifecycle

```typescript
type AgentLifecycle = "running" | "stopped" | "destroyed";
```

### AgentImage

Snapshot for stop/resume capability.

```typescript
interface AgentImage {
  readonly imageId: string;
  readonly containerId: string;
  readonly agentId: string;
  readonly name: string;
  readonly description?: string;
  readonly systemPrompt?: string;
  readonly messages: ImageMessage[];
  readonly parentImageId?: string;
  readonly createdAt: number;

  resume(): Promise<Agent>;
}

type ImageMessage = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage;
```

### Container

Runtime isolation boundary for Agents.

```typescript
interface Container {
  readonly containerId: string;
  readonly createdAt: number;

  // Image -> Agent lifecycle
  runImage(image: ImageRecord): Promise<{ agent: Agent; reused: boolean }>;
  stopImage(imageId: string): Promise<boolean>;
  getAgentIdForImage(imageId: string): string | undefined;
  isImageOnline(imageId: string): boolean;

  // Agent operations
  getAgent(agentId: string): Agent | undefined;
  listAgents(): Agent[];
  get agentCount(): number;
  destroyAgent(agentId: string): Promise<boolean>;
  destroyAllAgents(): Promise<void>;

  // Lifecycle
  dispose(): Promise<void>;
}
```

---

## Session Types

### SessionRecord

```typescript
interface SessionRecord {
  sessionId: string;
  imageId: string;
  containerId: string;
  createdAt: number;
  updatedAt: number;
}
```

### ImageRecord

```typescript
interface ImageRecord {
  imageId: string;
  containerId: string;
  sessionId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  parentImageId?: string;
  mcpServers?: Record<string, McpServerConfig>;
  metadata?: ImageMetadata;
  createdAt: number;
  updatedAt: number;
}

interface ImageMetadata {
  driverSessionId?: string;
}
```

---

## Command Types

Request/Response events for Runtime operations.

### Container Commands

```typescript
// Create
interface ContainerCreateRequest {
  type: "container_create_request";
  data: { requestId: string; containerId: string };
}

interface ContainerCreateResponse {
  type: "container_create_response";
  data: AgentXResponse & { containerId: string };
}

// Get
interface ContainerGetRequest {
  type: "container_get_request";
  data: { requestId: string; containerId: string };
}

interface ContainerGetResponse {
  type: "container_get_response";
  data: AgentXResponse & { containerId?: string; exists: boolean };
}

// List
interface ContainerListRequest {
  type: "container_list_request";
  data: { requestId: string };
}

interface ContainerListResponse {
  type: "container_list_response";
  data: AgentXResponse & { containerIds: string[] };
}
```

### Agent Commands

```typescript
// Send message
interface MessageSendRequest {
  type: "message_send_request";
  data: {
    requestId: string;
    imageId?: string;
    agentId?: string;
    content: string | UserContentPart[];
  };
}

interface MessageSendResponse {
  type: "message_send_response";
  data: AgentXResponse & { imageId?: string; agentId: string };
}

// Interrupt
interface AgentInterruptRequest {
  type: "agent_interrupt_request";
  data: { requestId: string; imageId?: string; agentId?: string };
}

interface AgentInterruptResponse {
  type: "agent_interrupt_response";
  data: AgentXResponse & { imageId?: string; agentId?: string };
}
```

### Image Commands

```typescript
// Create
interface ImageCreateRequest {
  type: "image_create_request";
  data: {
    requestId: string;
    containerId: string;
    config: { name?: string; description?: string; systemPrompt?: string };
  };
}

interface ImageCreateResponse {
  type: "image_create_response";
  data: AgentXResponse & { record?: ImageRecord };
}

// Run
interface ImageRunRequest {
  type: "image_run_request";
  data: { requestId: string; imageId: string };
}

interface ImageRunResponse {
  type: "image_run_response";
  data: AgentXResponse & { imageId: string; agentId: string; reused: boolean };
}

// Stop
interface ImageStopRequest {
  type: "image_stop_request";
  data: { requestId: string; imageId: string };
}

interface ImageStopResponse {
  type: "image_stop_response";
  data: AgentXResponse & { imageId: string };
}

// List
interface ImageListRequest {
  type: "image_list_request";
  data: { requestId: string; containerId?: string };
}

interface ImageListItem extends ImageRecord {
  online: boolean;
  agentId?: string;
}

interface ImageListResponse {
  type: "image_list_response";
  data: AgentXResponse & { records: ImageListItem[] };
}
```

---

## Network Types

Channel abstraction for client-server communication.

### ChannelConnection

```typescript
interface ChannelConnection {
  readonly id: string;

  send(message: string): void;
  sendReliable(message: string, options?: SendReliableOptions): void;
  onMessage(handler: (message: string) => void): Unsubscribe;
  onClose(handler: () => void): Unsubscribe;
  onError(handler: (error: Error) => void): Unsubscribe;
  close(): void;
}

interface SendReliableOptions {
  onAck?: () => void;
  timeout?: number;
  onTimeout?: () => void;
}
```

### ChannelServer

```typescript
interface ChannelServer {
  listen(port: number, host?: string): Promise<void>;
  attach(server: MinimalHTTPServer, path?: string): void;
  onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe;
  broadcast(message: string): void;
  close(): Promise<void>;
  dispose(): Promise<void>;
}
```

### ChannelClient

```typescript
interface ChannelClient {
  readonly readyState: "connecting" | "open" | "closing" | "closed";

  connect(): Promise<void>;
  send(message: string): void;
  onMessage(handler: (message: string) => void): Unsubscribe;
  onOpen(handler: () => void): Unsubscribe;
  onClose(handler: () => void): Unsubscribe;
  onError(handler: (error: Error) => void): Unsubscribe;
  close(): void;
  dispose(): void;
}
```

---

## Queue Types

Reliable event delivery with persistence guarantee.

### EventQueue

```typescript
interface EventQueue {
  publish(topic: string, event: unknown): string;
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;
  ack(consumerId: string, topic: string, cursor: string): Promise<void>;
  getCursor(consumerId: string, topic: string): Promise<string | null>;
  recover(topic: string, afterCursor?: string, limit?: number): Promise<QueueEntry[]>;
  close(): Promise<void>;
}
```

### QueueEntry

```typescript
interface QueueEntry {
  readonly cursor: string; // Format: "{timestamp_base36}-{sequence}"
  readonly topic: string;
  readonly event: unknown;
  readonly timestamp: number;
}
```

---

## AgentX API Types

### AgentDefinition

```typescript
interface AgentDefinition {
  name: string;
  description?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
}
```

### AgentX Interface

```typescript
interface AgentX {
  // Core API
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>>;

  on<T extends string>(type: T, handler: (event: SystemEvent & { type: T }) => void): Unsubscribe;

  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe;

  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;

  // Server API (local mode only)
  listen(port: number, host?: string): Promise<void>;
  close(): Promise<void>;

  // Lifecycle
  dispose(): Promise<void>;
}
```

### Configuration Types

```typescript
// Local mode
interface LocalConfig {
  llm?: LLMConfig;
  logger?: LoggerConfig;
  defaultAgent?: AgentDefinition;
  agentxDir?: string;
  environment?: { claudeCodePath?: string };
  environmentFactory?: EnvironmentFactory;
  server?: MinimalHTTPServer;
}

// Remote mode
interface RemoteConfig {
  serverUrl: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  context?:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
}

type AgentXConfig = LocalConfig | RemoteConfig;
```

---

## Usage Examples

### Subscribing to Events

```typescript
import type { AgentEngine, TextDeltaEvent, AssistantMessageEvent } from "@agentxjs/types/agent";

function setupEventHandlers(engine: AgentEngine) {
  // Subscribe to specific event type
  engine.on("text_delta", (event: TextDeltaEvent) => {
    process.stdout.write(event.data.text);
  });

  // Batch subscribe
  engine.on({
    text_delta: (event) => console.log(event.data.text),
    assistant_message: (event) => console.log("Complete:", event.data.content),
  });

  // React-style subscription
  engine.react({
    onTextDelta: (event) => process.stdout.write(event.data.text),
    onAssistantMessage: (event) => setMessages((prev) => [...prev, event.data]),
  });
}
```

### Handling Messages

```typescript
import type { Message } from "@agentxjs/types/agent";

function handleMessage(msg: Message) {
  switch (msg.subtype) {
    case "user":
      console.log("User:", msg.content);
      break;
    case "assistant":
      console.log("Assistant:", msg.content);
      break;
    case "tool-call":
      console.log("Tool Call:", msg.toolCall.name);
      break;
    case "tool-result":
      console.log("Tool Result:", msg.toolResult.output);
      break;
    case "error":
      console.log("Error:", msg.content);
      break;
  }
}
```

### Type Guards

```typescript
import { isStateEvent, isMessageEvent, isTurnEvent } from "@agentxjs/types/agent";
import { isCommandEvent, isCommandRequest, isCommandResponse } from "@agentxjs/types/event";
import { isFromSource, hasIntent, isRequest, isResult } from "@agentxjs/types/event";

function processEvent(event: SystemEvent) {
  if (isFromSource(event, "agent")) {
    if (isStateEvent(event)) {
      console.log("State event:", event.type);
    }
    if (isMessageEvent(event)) {
      console.log("Message event:", event.type);
    }
  }

  if (isCommandEvent(event)) {
    if (isCommandRequest(event)) {
      console.log("Request:", event.type);
    }
    if (isCommandResponse(event)) {
      console.log("Response:", event.type);
    }
  }
}
```

---

## Two-Domain Architecture

AgentX separates concerns into two domains:

### AgentEngine Domain (`@agentxjs/types/agent`)

- Independent and testable without Runtime
- Lightweight events: `type`, `timestamp`, `data`
- Pure Mealy Machine event processing

### Runtime Domain (`@agentxjs/types/runtime`)

- Full system management
- Rich events with context: `source`, `category`, `intent`, `context`
- Container lifecycle, Session persistence, Sandbox isolation

```
Runtime Domain                      AgentEngine Domain
---------------------------------------------------------------
Agent (complete entity)             AgentEngine (processing unit)
  - lifecycle: stop/resume            - receive/on/react
  - LLM + Sandbox + Session           - Driver + MealyMachine + Presenter

SystemEvent (full context)          EngineEvent (lightweight)
  - source, category, intent          - type, timestamp, data

DriveableEvent                      StreamEvent
  - from Environment                  - simplified for Engine
        |                                    ^
        +-------- Driver converts ----------+
```

---

## Related Packages

| Package             | Description                                   |
| ------------------- | --------------------------------------------- |
| `@agentxjs/common`  | Logger, SQLite, Path utilities implementation |
| `@agentxjs/agent`   | AgentEngine implementation                    |
| `@agentxjs/runtime` | Runtime, Container, Session implementation    |
| `@agentxjs/network` | WebSocket channel implementation              |
| `@agentxjs/queue`   | Event queue with SQLite persistence           |
| `agentxjs`          | Unified AgentX API                            |
