# @agentxjs/core

Core types, interfaces, and agent engine for the AgentX framework.

You typically don't install this directly — it's pulled in as a dependency of `agentxjs` and platform/driver packages.

## Architecture

```
Image  ──has──►  Session (message history)
  │
  ├──has──►  Workspace (file operations)
  │
  └──creates──►  Agent  ──uses──►  Driver (LLM communication)
                   │
                   └──runs on──►  Platform (DI container)
```

## Key Concepts

| Concept | What it is | Analogy |
|---------|-----------|---------|
| Image | Persistent agent config (prompt, tools, workspace) | Docker image |
| Session | Message history for an image | Conversation log |
| Agent | Running instance of an image | Docker container |
| Workspace | Agent's isolated working directory | Project folder |
| Driver | LLM communication bridge | API client |
| Platform | Infrastructure dependencies (DI container) | Runtime environment |

## Sub-module Imports

```typescript
import { ... } from "@agentxjs/core/agent";       // Agent engine
import { ... } from "@agentxjs/core/driver";       // Driver interface, ToolDefinition
import { ... } from "@agentxjs/core/platform";     // AgentXPlatform
import { ... } from "@agentxjs/core/runtime";      // AgentXRuntime
import { ... } from "@agentxjs/core/workspace";    // Workspace, WorkspaceProvider
import { ... } from "@agentxjs/core/image";        // Image management
import { ... } from "@agentxjs/core/session";      // Session management
import { ... } from "@agentxjs/core/event";        // EventBus
import { ... } from "@agentxjs/core/bash";         // BashProvider
import { ... } from "@agentxjs/core/persistence";  // Repository interfaces
import { ... } from "@agentxjs/core/network";      // JSON-RPC protocol
import { ... } from "@agentxjs/core/llm";          // LLM provider types
```

## Runtime Operations

Three first-class operations on a running agent:

```typescript
interface AgentXRuntime {
  // Send message → Driver → LLM → stream events
  receive(instanceId, content): Promise<void>;

  // Interrupt current response
  interrupt(instanceId): void;

  // Rewind to message — truncate session + reset circuit breaker + emit event
  rewind(instanceId, messageId): Promise<void>;
}
```

## Platform (DI Container)

```typescript
interface AgentXPlatform {
  // Required
  containerRepository: ContainerRepository;
  imageRepository: ImageRepository;
  sessionRepository: SessionRepository;
  eventBus: EventBus;

  // Optional
  bashProvider?: BashProvider;            // Shell execution
  workspaceProvider?: WorkspaceProvider;  // File operations per agent
  contextProvider?: ContextProvider;      // Cognitive context (e.g. RoleX)
  llmProviderRepository?: LLMProviderRepository;
  channelServer?: ChannelServer;          // WebSocket server
  channelClient?: ChannelClientFactory;   // WebSocket client
}
```

## Workspace

Each Image auto-generates a `workspaceId`. When `workspaceProvider` is available, agents get 6 built-in file tools: read, write, edit, grep, glob, list.

```typescript
interface Workspace {
  read(path, options?): Promise<string>;
  write(path, content): Promise<void>;
  exists(path): Promise<boolean>;
  stat(path): Promise<FileStat | null>;
  remove(path): Promise<void>;
  list(path?): Promise<FileEntry[]>;
  mkdir(path): Promise<void>;
}

interface WorkspaceProvider {
  create(workspaceId): Promise<Workspace>;
}
```

## Driver

```typescript
interface Driver {
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  interrupt(): void;
  readonly supportedProtocols: readonly LLMProtocol[];
}

type CreateDriver = (config: DriverConfig) => Driver;
```

**Dependencies**: `commonxjs`, `rxjs`, `jsonrpc-lite`
