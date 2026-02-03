# @agentxjs/core/agent

Event Processing Unit for AI Conversations - Pure Mealy Machine implementation.

## Overview

The agent module is the core event processing engine of AgentX. It transforms raw stream events from LLM providers into structured, typed events for UI consumption.

```
StreamEvent (from LLM)     AgentOutput (to UI)
         │                        ▲
         ▼                        │
    ┌─────────────────────────────┴───┐
    │         MealyMachine            │
    │  ┌───────────────────────────┐  │
    │  │     AgentProcessor        │  │
    │  │  ┌─────────────────────┐  │  │
    │  │  │ MessageAssembler    │──┼──┼──► MessageEvent
    │  │  ├─────────────────────┤  │  │
    │  │  │ StateEventProcessor │──┼──┼──► StateEvent
    │  │  ├─────────────────────┤  │  │
    │  │  │ TurnTracker         │──┼──┼──► TurnEvent
    │  │  └─────────────────────┘  │  │
    │  └───────────────────────────┘  │
    └─────────────────────────────────┘
```

## Key Concepts

### Mealy Machine Pattern

The core insight is that **state is a means, outputs are the goal**.

```typescript
// Traditional Redux: state is the goal
(state, action) => newState

// Mealy Machine: outputs are the goal
(state, input) => [newState, outputs]
```

This pattern enables:

- Pure functions (testable, no side effects)
- Event chaining (outputs can trigger more processing)
- Stateless processors (state managed externally)

### Event Layers

| Layer       | Events                                                              | Purpose              |
| ----------- | ------------------------------------------------------------------- | -------------------- |
| **Stream**  | `message_start`, `text_delta`, `tool_use_start`, `message_stop`     | Raw LLM events       |
| **Message** | `assistant_message`, `tool_call_message`, `tool_result_message`     | Complete messages    |
| **State**   | `conversation_start`, `conversation_responding`, `conversation_end` | UI state transitions |
| **Turn**    | `turn_request`, `turn_response`                                     | Analytics & billing  |

## Usage

### Basic Usage

```typescript
import { createAgent, type AgentDriver, type AgentPresenter } from "@agentxjs/core/agent";

// Define a driver (produces stream events)
const driver: AgentDriver = {
  receive: async function* (message) {
    yield { type: "message_start", data: { messageId: "msg_1" }, timestamp: Date.now() };
    yield { type: "text_delta", data: { text: "Hello!" }, timestamp: Date.now() };
    yield { type: "message_stop", data: { stopReason: "end_turn" }, timestamp: Date.now() };
  },
  interrupt: () => {},
};

// Define a presenter (consumes agent output)
const presenter: AgentPresenter = {
  present: (agentId, event) => {
    console.log(`[${agentId}] ${event.type}:`, event.data);
  },
};

// Create agent
const agent = createAgent({ driver, presenter });

// Subscribe to events
agent.on("text_delta", (e) => console.log(e.data.text));
agent.on("assistant_message", (e) => console.log("Complete:", e.data.content));

// Send message
await agent.receive("Hello, AI!");
```

### React-style Handlers

```typescript
agent.react({
  onTextDelta: (e) => updateUI(e.data.text),
  onAssistantMessage: (e) => saveMessage(e.data),
  onConversationStart: () => showThinking(),
  onConversationEnd: () => hideThinking(),
});
```

### State Machine

```typescript
import { AgentStateMachine } from "@agentxjs/core/agent";

const stateMachine = new AgentStateMachine();

stateMachine.onStateChange(({ prev, current }) => {
  console.log(`State: ${prev} → ${current}`);
});

// States: idle → thinking → responding → idle
//                    ↓
//              planning_tool → awaiting_tool_result → responding
```

### Custom Processors

```typescript
import { combineProcessors, filterProcessor, type Processor } from "@agentxjs/core/agent";

// Create a custom processor
const myProcessor: Processor<MyState, StreamEvent, MyOutput> = (state, input) => {
  if (input.type === "text_delta") {
    return [state, [{ type: "custom_event", data: input.data }]];
  }
  return [state, []];
};

// Combine with existing processors
const combined = combineProcessors({
  message: messageAssemblerProcessor,
  custom: myProcessor,
});
```

## Architecture

### Directory Structure

```
agent/
├── createAgent.ts          # AgentEngine factory
├── AgentStateMachine.ts    # State management
├── index.ts                # Public exports
│
└── engine/
    ├── MealyMachine.ts     # Mealy runtime with state store
    ├── AgentProcessor.ts   # Combined processor
    │
    ├── mealy/              # Mealy framework
    │   ├── Source.ts       # Input adapter type
    │   ├── Processor.ts    # Pure transition function type
    │   ├── Sink.ts         # Output adapter type
    │   ├── Store.ts        # State storage interface
    │   ├── Mealy.ts        # Runtime orchestrator
    │   └── combinators.ts  # Processor composition utilities
    │
    └── internal/           # Built-in processors
        ├── messageAssemblerProcessor.ts
        ├── stateEventProcessor.ts
        └── turnTrackerProcessor.ts
```

### Component Responsibilities

| Component             | Responsibility                         |
| --------------------- | -------------------------------------- |
| `AgentEngine`         | Coordinate driver, machine, presenter  |
| `MealyMachine`        | Process events, manage state per agent |
| `AgentProcessor`      | Combine all internal processors        |
| `MessageAssembler`    | Stream → Message events                |
| `StateEventProcessor` | Stream → State events                  |
| `TurnTracker`         | Message → Turn events                  |
| `AgentStateMachine`   | Track agent state from StateEvents     |

## API Reference

### createAgent(options)

```typescript
function createAgent(options: CreateAgentOptions): AgentEngine;

interface CreateAgentOptions {
  driver: AgentDriver;
  presenter: AgentPresenter;
}
```

### AgentEngine

```typescript
interface AgentEngine {
  readonly agentId: string;
  readonly state: AgentState;
  readonly messageQueue: MessageQueue;

  // Send message
  receive(message: string | UserMessage): Promise<void>;

  // Event subscription
  on(handler: AgentOutputCallback): Unsubscribe;
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  react(handlers: ReactHandlerMap): Unsubscribe;

  // State subscription
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  // Lifecycle
  onReady(handler: () => void): Unsubscribe;
  onDestroy(handler: () => void): Unsubscribe;

  // Middleware
  use(middleware: AgentMiddleware): Unsubscribe;
  intercept(interceptor: AgentInterceptor): Unsubscribe;

  // Control
  interrupt(): void;
  destroy(): Promise<void>;
}
```

### Processor Type

```typescript
type Processor<TState, TInput, TOutput> = (
  state: Readonly<TState>,
  input: TInput
) => [TState, TOutput[]];
```

### Combinators

```typescript
// Combine multiple processors (parallel)
combineProcessors<TState, TInput, TOutput>(processors): Processor;

// Chain processors (sequential)
chainProcessors<TState, TEvent>(...processors): Processor;

// Filter events before processing
filterProcessor<TState, TInput, TOutput>(
  predicate: (event: TInput) => boolean,
  processor: Processor
): Processor;

// Transform outputs
mapOutput<TState, TInput, TOutput, TMapped>(
  processor: Processor,
  mapper: (output: TOutput) => TMapped
): Processor;

// Add logging
withLogging<TState, TInput, TOutput>(
  processor: Processor,
  name: string
): Processor;
```

## Testing

```bash
cd packages-new/core
bun test
```

```
✅ 175 tests pass
✅ 0 fail
✅ 265ms
```

### Test Coverage

- Mealy framework: Store, combinators, runtime
- Internal processors: message assembly, state events, turn tracking
- AgentStateMachine: state transitions, subscriptions
- createAgent: full agent lifecycle, middleware, interceptors

## Platform Independence

This module has **zero platform dependencies**:

- No `node:*` imports
- No `bun:*` imports
- No `ws`, `ioredis`, or other platform-specific packages
- Only depends on `rxjs` (pure JavaScript)

Can run in: Node.js, Bun, Deno, Cloudflare Workers, Browser.

## License

MIT
