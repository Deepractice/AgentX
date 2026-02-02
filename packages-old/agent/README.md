# @agentxjs/agent

> Pure event processing engine for AI Agent conversations

## Overview

`@agentxjs/agent` is the event processing core of the AgentX framework. It transforms streaming LLM outputs into structured conversation events using the **Mealy Machine** pattern.

**Key Characteristics:**

- **Pure Event Processing** - `(state, input) -> (state, outputs)`
- **No I/O Operations** - All I/O is delegated to Driver (input) and Presenter (output)
- **4-Layer Event System** - Stream, State, Message, Turn
- **Testable** - No mocks needed, just test inputs and outputs

## Installation

```bash
bun add @agentxjs/agent
```

## Architecture

```
                         AgentEngine
+------------------------------------------------------------------+
|                                                                   |
|   Driver              MealyMachine           Presenter            |
|   (Source)            (Processor)            (Sink)               |
|      |                     |                    ^                 |
|      | StreamEvent         | AgentOutput        |                 |
|      v                     v                    |                 |
|   [receive] -----> [process] -----> [emit] ----+                  |
|                         |                                         |
|                  +------+------+                                  |
|                  |             |                                  |
|            StateMachine   MessageQueue                            |
|                                                                   |
+------------------------------------------------------------------+
```

**Data Flow:**

1. **Driver** produces `StreamEvent` from LLM
2. **MealyMachine** transforms events into `AgentOutput` (Stream + State + Message + Turn)
3. **StateMachine** updates agent state based on `StateEvent`
4. **Presenter** consumes `AgentOutput` for side effects

## Quick Start

```typescript
import { createAgent } from "@agentxjs/agent";
import type { AgentDriver, AgentPresenter } from "@agentxjs/types/agent";

// Driver: produces StreamEvents
const driver: AgentDriver = {
  name: "MockDriver",
  async *receive(message) {
    yield { type: "message_start", timestamp: Date.now(), data: {} };
    yield { type: "text_delta", timestamp: Date.now(), data: { text: "Hello!" } };
    yield { type: "message_stop", timestamp: Date.now(), data: { stopReason: "end_turn" } };
  },
  interrupt() {},
};

// Presenter: consumes AgentOutput
const presenter: AgentPresenter = {
  name: "LogPresenter",
  present(agentId, output) {
    console.log(`[${output.type}]`, output.data);
  },
};

// Create agent
const agent = createAgent({ driver, presenter });

// Subscribe to events
agent.on("text_delta", (e) => process.stdout.write(e.data.text));
agent.on("assistant_message", (e) => console.log("\nComplete:", e.data.content));

// Send message
await agent.receive("Hello!");

// Cleanup
await agent.destroy();
```

## Core Components

### AgentEngine

Coordinates event flow between Driver, Processor, and Presenter.

```typescript
interface AgentEngine {
  readonly agentId: string;
  readonly state: AgentState;

  // Send message
  receive(message: string | UserMessage): Promise<void>;

  // Event subscription
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  react(handlers: ReactHandlerMap): Unsubscribe;

  // State changes
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  // Lifecycle
  interrupt(): void;
  destroy(): Promise<void>;

  // Advanced
  use(middleware: AgentMiddleware): Unsubscribe;
  intercept(interceptor: AgentInterceptor): Unsubscribe;
}
```

### MealyMachine

Pure event processor implementing the Mealy Machine pattern.

```typescript
import { createMealyMachine } from "@agentxjs/agent";

const machine = createMealyMachine();

// Process event -> get outputs
const outputs = machine.process(agentId, streamEvent);

// Clean up
machine.clearState(agentId);
```

### AgentStateMachine

Manages agent state transitions driven by `StateEvent`.

```typescript
import { AgentStateMachine } from "@agentxjs/agent";

const sm = new AgentStateMachine();

sm.onStateChange(({ prev, current }) => {
  console.log(`${prev} -> ${current}`);
});

sm.process(stateEvent); // Updates internal state
console.log(sm.state); // "idle" | "thinking" | "responding" | ...
```

## Event Layers

```
Layer 1: Stream (real-time)
  message_start, text_delta, tool_use_start, message_stop...
       |
       v  MessageAssembler
Layer 2: Message (complete units)
  assistant_message, tool_call_message, tool_result_message...
       |
       v  StateEventProcessor
Layer 3: State (transitions)
  conversation_start, conversation_responding, conversation_end...
       |
       v  TurnTracker
Layer 4: Turn (analytics)
  turn_request, turn_response (duration, tokens, cost)
```

## Event Subscription

```typescript
// Single event type
agent.on("text_delta", (e) => console.log(e.data.text));

// Multiple types
agent.on(["message_start", "message_stop"], (e) => console.log(e.type));

// All events
agent.on((e) => console.log(e.type));

// React-style (onXxx -> xxx_xxx)
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log(e.data.content),
});

// Batch
agent.on({
  text_delta: (e) => process.stdout.write(e.data.text),
  assistant_message: (e) => console.log(e.data.content),
});
```

## Internal Processors

For advanced use cases, individual processors are exported:

```typescript
import {
  messageAssemblerProcessor,
  stateEventProcessor,
  turnTrackerProcessor,
  createInitialMessageAssemblerState,
} from "@agentxjs/agent";

// Use directly for custom pipelines
let state = createInitialMessageAssemblerState();
const [newState, outputs] = messageAssemblerProcessor(state, event);
```

## Processor Combinators

Build custom processors using combinators:

```typescript
import { combineProcessors, chainProcessors, filterProcessor, mapOutput } from "@agentxjs/agent";

// Combine processors (parallel)
const combined = combineProcessors({ a: processorA, b: processorB });

// Chain processors (sequential)
const pipeline = chainProcessors(preprocess, main, postprocess);

// Filter inputs
const textOnly = filterProcessor((e) => e.type === "text_delta", processor);

// Transform outputs
const withMeta = mapOutput(processor, (o) => ({ ...o, meta: {} }));
```

## Design Principles

1. **Pure Functions** - Processors have no side effects
2. **State is Means, Output is Goal** - State accumulates to produce outputs
3. **Separation of Concerns** - Driver (I/O), Processor (pure), Presenter (I/O)
4. **Composable** - Complex behavior from simple parts

## Related Packages

- [@agentxjs/types](../types) - Type definitions
- [@agentxjs/common](../common) - Logger, utilities
- [@agentxjs/runtime](../runtime) - Container, Session, Bus
- [agentxjs](../agentx) - Unified API

## Documentation

For detailed documentation, see [docs/packages/agent.md](../../docs/packages/agent.md).

## License

MIT
