# Architecture Overview

AgentX is an event-driven AI Agent framework built on a clean separation between the **Engine domain** (pure logic) and **Runtime domain** (infrastructure).

## Two-Domain Architecture

```mermaid
graph TB
    subgraph "Engine Domain (Pure Logic)"
        DR[AgentDriver]
        EG[AgentEngine]
        MM[MealyMachine]
        PR[Presenter]

        DR -->|"StreamEvent"| EG
        EG --> MM
        EG --> PR
    end

    subgraph "Runtime Domain (Infrastructure)"
        RT[Runtime]
        CT[Container]
        AG[Agent]
        SS[Session]
        SB[Sandbox]
        BUS[SystemBus]

        RT --> BUS
        RT --> CT
        CT --> AG
        AG --> SS
        AG --> SB
    end

    subgraph "External"
        LLM[Claude API]
        MCP[MCP Tools]
        DB[(Storage)]
    end

    AG --> EG
    DR --> LLM
    SB --> MCP
    SS --> DB
```

### Engine Domain

The Engine domain is **independent and testable without I/O**. It can be tested with mock drivers.

| Component | Responsibility |
|-----------|---------------|
| **AgentDriver** | Message processor: `receive(message) → AsyncIterable<StreamEvent>` |
| **AgentEngine** | Event processing coordinator, state management |
| **MealyMachine** | Pure state machine for event assembly |
| **Presenter** | Event consumer interface (side effects) |

**Key characteristic**: Engine uses **lightweight events** with only `{ type, timestamp, data }`.

### Runtime Domain

The Runtime domain manages the **complete system lifecycle** with persistence, isolation, and event routing.

| Component | Responsibility |
|-----------|---------------|
| **Runtime** | Top-level API, SystemBus owner |
| **SystemBus** | Event routing and subscription |
| **Container** | Isolation boundary, agent registry |
| **Agent** | Complete runtime entity (Engine + Session + Sandbox) |
| **Session** | Conversation history, persistence |
| **Sandbox** | Isolated environment (filesystem, MCP tools) |

**Key characteristic**: Runtime uses **full events** with `{ type, timestamp, data, source, category, intent, context }`.

## Two Event Structures

AgentX has two event structures for different purposes:

```mermaid
graph LR
    subgraph "EngineEvent (Lightweight)"
        E1["{ type, timestamp, data }"]
    end

    subgraph "SystemEvent (Full)"
        E2["{ type, timestamp, data,<br/>source, category, intent, context }"]
    end

    E1 -->|"Presenter enriches"| E2
```

| Field | EngineEvent | SystemEvent |
|-------|-------------|-------------|
| type | Event identifier | Event identifier |
| timestamp | When it happened | When it happened |
| data | Event payload | Event payload |
| source | - | Where it came from |
| category | - | Classification |
| intent | - | notification/request/result |
| context | - | Scope (containerId, agentId, sessionId) |

**Why two structures?**
- Engine needs minimal overhead for pure event processing
- Runtime needs rich metadata for routing, filtering, and debugging

## Event Sources and Categories

SystemEvent uses `source` and `category` for classification:

```mermaid
graph TD
    SE[SystemEvent]

    SE --> ENV["source: environment"]
    SE --> AGT["source: agent"]
    SE --> CMD["source: command"]
    SE --> SSN["source: session"]
    SE --> CTN["source: container"]
    SE --> SBX["source: sandbox"]

    AGT --> STR["category: stream"]
    AGT --> STA["category: state"]
    AGT --> MSG["category: message"]
    AGT --> TRN["category: turn"]

    CMD --> REQ["category: request"]
    CMD --> RES["category: response"]
```

| Source | Categories | Description |
|--------|-----------|-------------|
| `agent` | stream, state, message, turn | Agent internal events (4-layer) |
| `command` | request, response | API operations |
| `environment` | stream, connection | External world (Claude API) |
| `session` | lifecycle, persist, action | Session operations |
| `container` | lifecycle | Container operations |
| `sandbox` | workdir, mcp | Sandbox resources |

## Four-Layer Event System

Agent events follow a 4-layer hierarchy, each serving different consumers:

```mermaid
graph TB
    subgraph "L1: Stream Layer"
        S1[message_start]
        S2[text_delta]
        S3[tool_use_start]
        S4[tool_use_stop]
        S5[tool_result]
        S6[message_stop]
    end

    subgraph "L2: State Layer"
        ST1[conversation_start]
        ST2[conversation_thinking]
        ST3[conversation_responding]
        ST4[tool_executing]
        ST5[tool_completed]
        ST6[conversation_end]
    end

    subgraph "L3: Message Layer"
        M1[user_message]
        M2[assistant_message]
        M3[tool_call_message]
        M4[tool_result_message]
    end

    subgraph "L4: Turn Layer"
        T1[turn_request]
        T2[turn_response]
    end

    S2 -->|"MealyMachine<br/>assembles"| M2
    ST1 --> T1
    ST6 --> T2
```

| Layer | Category | Purpose | Consumers |
|-------|----------|---------|-----------|
| **Stream** | stream | Real-time incremental updates | UI typewriter effect |
| **State** | state | Agent state transitions | Loading indicators, state machines |
| **Message** | message | Complete conversation records | Chat history, persistence |
| **Turn** | turn | Usage metrics and analytics | Billing, monitoring |

## Command Event Pattern

All API operations use request/response events:

```mermaid
sequenceDiagram
    participant Client
    participant AgentX
    participant Runtime
    participant Container

    Client->>AgentX: request("container_create_request", { containerId })
    AgentX->>Runtime: emit(ContainerCreateRequest)
    Runtime->>Container: create()
    Container-->>Runtime: created
    Runtime-->>AgentX: emit(ContainerCreateResponse)
    AgentX-->>Client: return response
```

Request types and their responses:

| Request | Response | Description |
|---------|----------|-------------|
| `container_create_request` | `container_create_response` | Create container |
| `agent_run_request` | `agent_run_response` | Run agent |
| `agent_receive_request` | `agent_receive_response` | Send message |
| `agent_destroy_request` | `agent_destroy_response` | Destroy agent |
| `image_snapshot_request` | `image_snapshot_response` | Create image |

## AgentX: Local vs Remote

AgentX provides the same API for both local and remote modes:

```mermaid
graph TB
    subgraph "Local Mode"
        AX1[AgentX]
        RT1[Runtime]
        LLM1[Claude API]

        AX1 --> RT1
        RT1 --> LLM1
    end

    subgraph "Remote Mode"
        AX2[AgentX]
        WS[WebSocket]
        SRV[Server]
        RT2[Runtime]
        LLM2[Claude API]

        AX2 --> WS
        WS --> SRV
        SRV --> RT2
        RT2 --> LLM2
    end
```

```typescript
// Local mode - embedded runtime
const agentx = await createAgentX();

// Remote mode - connect to server
const agentx = await createAgentX({ server: "ws://localhost:5200" });

// Same API for both!
await agentx.request("agent_run_request", { containerId, config });
agentx.on("text_delta", (e) => console.log(e.data.text));
```

## Package Dependencies

```mermaid
graph BT
    T["@agentxjs/types<br/>(zero deps)"]
    C["@agentxjs/common<br/>(logger)"]
    E["@agentxjs/engine<br/>(MealyMachine)"]
    A["@agentxjs/agent<br/>(AgentEngine)"]
    X["agentxjs<br/>(AgentX API)"]
    N["@agentxjs/node-runtime<br/>(ClaudeDriver, SQLite)"]
    U["@agentxjs/ui<br/>(React components)"]

    T --> C
    C --> E
    E --> A
    A --> X
    X --> N
    N --> U
```

## Next Steps

- [Event System](./event-system.md) - Deep dive into the four-layer event system
- [Lifecycle](./lifecycle.md) - Agent lifecycle management
- [Mealy Machine](./mealy-machine.md) - The core state machine pattern
