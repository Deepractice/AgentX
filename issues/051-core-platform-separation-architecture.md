# Issue #051: Core-Platform Separation Architecture

**Status**: Planning
**Priority**: High
**Created**: 2025-02-02
**Related**: #043 (Persistence Extraction), #011 (Distributed Architecture)

---

## Background

To support Deepractice Cloud deployment on Cloudflare Workers (Durable Objects), AgentX needs a platform-agnostic core that can be assembled with different platform adapters.

Current architecture assumes single-process long-running server, conflicting with Workers' stateless short-lived function model:

| Component          | Current Implementation     | Workers Compatibility | Action                    |
| ------------------ | -------------------------- | --------------------- | ------------------------- |
| WebSocket          | `ws` package (Node native) | :x:                   | Abstract to SPI           |
| SystemBus          | In-memory RxJS Subject     | :white_check_mark:    | Keep (DO single-instance) |
| Timer/Heartbeat    | setInterval                | :x:                   | Abstract to SPI           |
| Session Storage    | SQLite file                | :x:                   | Add D1 driver             |
| RxJS               | Pure JS                    | :white_check_mark:    | Keep                      |
| Event Architecture | Modular                    | :white_check_mark:    | Keep                      |

---

## Problem

### Too Many Packages

Current structure has 9 packages with complex dependency chain:

```
types → common → persistence → queue → network → agent → runtime → agentx → ui
```

**Issues:**

- 9 package.json = 9 build configs, version management, publish cycles
- Users need to remember: `@agentxjs/persistence/sqlite`, `@agentxjs/network`, ...
- Dependency chain too long
- Not following ResourceX's proven core-platform separation pattern

---

## Solution: Consolidate to 5 Packages

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User API - agentxjs                                         │
│    createAgentX({ provider: nodeProvider() })               │
│    createAgentX({ provider: cloudflareProvider(env) })      │
├─────────────────────────────────────────────────────────────┤
│  Core - @agentxjs/core (Platform-agnostic)                   │
│    ├── Types (from @agentxjs/types)                          │
│    ├── Utils (from @agentxjs/common)                         │
│    ├── Event System (RxJS, SystemBus)                        │
│    ├── Agent Lifecycle (AgentEngine, MessageQueue)           │
│    ├── State Machine (Mealy Machine)                         │
│    └── SPI Interfaces                                        │
│         ├── PersistenceDriverSPI                             │
│         ├── ChannelServerSPI                                 │
│         └── SchedulerSPI                                     │
├─────────────────────────────────────────────────────────────┤
│  Platform Adapters                                           │
│    ├── @agentxjs/node                                        │
│    │     ├── nodeProvider()                                  │
│    │     ├── NodeChannelServer (ws package)                  │
│    │     ├── sqliteDriver / redisDriver                      │
│    │     └── NodeScheduler (setInterval)                     │
│    │                                                          │
│    └── @agentxjs/cloudflare                                  │
│          ├── cloudflareProvider(env)                         │
│          ├── AgentDurableObject                              │
│          ├── DOChannelServer (WebSocketPair)                 │
│          ├── d1Driver                                        │
│          └── DOScheduler (hibernation alarm)                 │
├─────────────────────────────────────────────────────────────┤
│  UI - @agentxjs/ui (Frontend-only, no server deps)          │
└─────────────────────────────────────────────────────────────┘
```

### Package Mapping

| Before (9 packages)                | After (5 packages)       | Notes                        |
| ---------------------------------- | ------------------------ | ---------------------------- |
| @agentxjs/types                    | → @agentxjs/core/types   | Types with implementation    |
| @agentxjs/common                   | → @agentxjs/core/common  | Utils, logger                |
| @agentxjs/persistence (interfaces) | → @agentxjs/core/spi     | SPI only                     |
| @agentxjs/persistence (drivers)    | → @agentxjs/node/drivers | sqlite, redis, etc.          |
| @agentxjs/queue                    | → @agentxjs/core/queue   | RxJS parts                   |
| @agentxjs/queue (SQLite)           | → @agentxjs/node/queue   | Persistence                  |
| @agentxjs/network                  | → @agentxjs/node/network | ws package                   |
| @agentxjs/agent                    | → @agentxjs/core/agent   | Agent logic                  |
| @agentxjs/runtime                  | Split                    | Core → core, Platform → node |
| agentxjs                           | Keep                     | User entry point             |
| @agentxjs/ui                       | Keep                     | Frontend only                |
| (new)                              | @agentxjs/cloudflare     | Cloudflare adapter           |

### Why Types in Core (Not Separate Package)

```
Provider 模式下的依赖关系：

@agentxjs/core          # 所有平台的共同依赖
├── types/              # 类型定义在这里
├── spi/                # Provider 接口
└── ...
      ↑
      ├── @agentxjs/node       # 依赖 core，自然获得 types
      └── @agentxjs/cloudflare # 依赖 core，自然获得 types
```

**不需要独立 types 包的原因：**

1. 所有平台包都依赖 core → core/types 天然可用
2. Provider 模式已解决跨平台 → 不需要 types 做中间层
3. 减少一个包 → 更简洁

---

## SPI Interface Design

### AgentXProvider

```typescript
// @agentxjs/core/src/spi/AgentXProvider.ts
export interface AgentXProvider {
  readonly platform: "node" | "cloudflare" | "browser";

  /**
   * Create persistence layer
   */
  createPersistence(config?: PersistenceConfig): Promise<Persistence>;

  /**
   * Create channel server (WebSocket)
   * Optional - not needed for browser/remote mode
   */
  createChannelServer?(config?: ChannelConfig): ChannelServerSPI;

  /**
   * Create scheduler for timers/heartbeat
   * Optional - uses default setTimeout if not provided
   */
  createScheduler?(): SchedulerSPI;
}
```

### ChannelServerSPI

```typescript
// @agentxjs/core/src/spi/ChannelServerSPI.ts
export interface ChannelServerSPI {
  /**
   * Handle new connection
   */
  onConnection(handler: (conn: ChannelConnection) => void): Unsubscribe;

  /**
   * Broadcast message to all connections
   */
  broadcast(message: string): void;

  /**
   * Close server
   */
  close(): Promise<void>;
}

export interface ChannelConnection {
  readonly id: string;
  send(message: string): void;
  sendReliable(message: string, options?: ReliableOptions): void;
  onMessage(handler: (message: string) => void): Unsubscribe;
  onClose(handler: () => void): Unsubscribe;
  close(): void;
}
```

### SchedulerSPI

```typescript
// @agentxjs/core/src/spi/SchedulerSPI.ts
export interface SchedulerSPI {
  /**
   * Schedule recurring task
   */
  setInterval(callback: () => void, ms: number): Disposable;

  /**
   * Schedule one-time task
   */
  setTimeout(callback: () => void, ms: number): Disposable;

  /**
   * Durable Objects: schedule alarm (optional)
   */
  scheduleAlarm?(timestamp: number): Promise<void>;
}

export interface Disposable {
  dispose(): void;
}
```

---

## User API

### Node.js

```typescript
import { createAgentX } from "agentxjs";
import { nodeProvider, sqliteDriver } from "@agentxjs/node";

const agentx = await createAgentX({
  provider: nodeProvider({
    persistence: sqliteDriver("./data.db"),
    llm: { apiKey: process.env.ANTHROPIC_API_KEY },
  }),
});

// Start server
const server = agentx.listen(5200);
```

### Cloudflare Workers

```typescript
// src/index.ts
import { createAgentX } from "agentxjs";
import { cloudflareProvider, AgentDurableObject } from "@agentxjs/cloudflare";

// Export Durable Object class
export { AgentDurableObject };

export default {
  async fetch(request: Request, env: Env) {
    const agentx = await createAgentX({
      provider: cloudflareProvider(env),
    });

    // Route to Durable Object
    const id = env.AGENT.idFromName("agent-1");
    const stub = env.AGENT.get(id);
    return stub.fetch(request);
  },
};
```

### Browser (Remote Mode)

```typescript
import { createAgentX } from "agentxjs";

// No provider needed - connects to remote server
const agentx = await createAgentX({
  serverUrl: "wss://api.example.com",
});

agentx.on("text_delta", (e) => console.log(e.data.text));
await agentx.request("message_send", { content: "Hello" });
```

---

## Migration Strategy: Incremental Consolidation

### Phase 1: Create @agentxjs/core (Foundation)

Consolidate in dependency order (bottom-up):

| Step | Package                  | Action         | Platform Dependency     |
| ---- | ------------------------ | -------------- | ----------------------- |
| 1.1  | types                    | → core/types   | :white_check_mark: None |
| 1.2  | common                   | → core/common  | :white_check_mark: None |
| 1.3  | persistence (interfaces) | → core/spi     | :white_check_mark: None |
| 1.4  | agent                    | → core/agent   | :white_check_mark: None |
| 1.5  | queue (RxJS parts)       | → core/queue   | :white_check_mark: None |
| 1.6  | runtime (core logic)     | → core/runtime | :white_check_mark: None |

**Result:** `@agentxjs/core` contains all platform-agnostic code.

### Phase 2: Create @agentxjs/node

| Step | Package               | Action         |
| ---- | --------------------- | -------------- |
| 2.1  | persistence (drivers) | → node/drivers |
| 2.2  | queue (SQLite)        | → node/queue   |
| 2.3  | network               | → node/network |
| 2.4  | runtime (Node parts)  | → node/runtime |
| 2.5  | Create nodeProvider   | Assemble all   |

**Result:** `@agentxjs/node` contains all Node.js-specific code.

### Phase 3: Create @agentxjs/cloudflare

| Step | Component          | Implementation            |
| ---- | ------------------ | ------------------------- |
| 3.1  | AgentDurableObject | DO class with hibernation |
| 3.2  | DOChannelServer    | WebSocketPair wrapper     |
| 3.3  | d1Driver           | D1 persistence driver     |
| 3.4  | DOScheduler        | Alarm-based scheduler     |
| 3.5  | cloudflareProvider | Assemble all              |

**Result:** `@agentxjs/cloudflare` ready for Workers deployment.

### Phase 4: Update agentxjs Entry Point

```typescript
// agentxjs/src/createAgentX.ts
export async function createAgentX(config: AgentXConfig): Promise<AgentX> {
  if (isRemoteConfig(config)) {
    // Browser/Remote mode - no provider needed
    return createRemoteAgentX(config);
  }

  if (!config.provider) {
    throw new Error("Provider required for local mode. Use @agentxjs/node or @agentxjs/cloudflare");
  }

  return createLocalAgentX(config);
}
```

### Phase 5: Cleanup

- Remove old packages from monorepo
- Update all imports
- Update documentation
- Release new versions

---

## Migration Strategy: Types First, Then Implementation

### Core Principle

```
每个模块迁移顺序：

┌─────────────────────────────────────────────────────────┐
│ Step 1: 迁移 Types                                       │
│   └── 先把类型定义迁到 core/types/xxx/                   │
│       └── 确定接口契约，不涉及实现                        │
├─────────────────────────────────────────────────────────┤
│ Step 2: 迁移实现（边迁边检查平台耦合）                    │
│   ├── 检查每个 import                                    │
│   │   ├── 纯 JS/TS → ✅ 直接迁到 core                    │
│   │   ├── node:* → ❌ 平台耦合                           │
│   │   ├── bun:* → ❌ 平台耦合                            │
│   │   ├── ws/ioredis/... → ❌ 平台耦合                   │
│   │   └── RxJS → ✅ 纯 JS                                │
│   │                                                      │
│   └── 平台耦合的处理：                                    │
│       1. 抽象出 SPI 接口 → core/spi/                     │
│       2. 实现放到 → node/xxx/ 或 cloudflare/xxx/         │
└─────────────────────────────────────────────────────────┘
```

### Platform Coupling Detection Checklist

迁移每个文件时，检查以下 imports：

```typescript
// ❌ 平台耦合 - 需要抽象
import { WebSocketServer } from "ws"; // → ChannelServerSPI
import Database from "bun:sqlite"; // → PersistenceDriverSPI
import { createServer } from "node:http"; // → 抽到 node/
import { readFile } from "node:fs/promises"; // → FileSystemSPI
import { join } from "node:path"; // → 需要 polyfill 或抽象
import { setTimeout } from "node:timers"; // → SchedulerSPI

// ✅ 平台无关 - 直接迁移
import { Subject, Observable } from "rxjs"; // 纯 JS
import { z } from "zod"; // 纯 JS
import type { Agent } from "./types"; // 纯类型
```

---

## Detailed Module Migration

### Module 1: types

**Step 1.1: 迁移类型定义**

```
packages/types/src/
├── agent/           → packages/core/src/types/agent/
├── event/           → packages/core/src/types/event/
├── runtime/         → packages/core/src/types/runtime/
├── network/         → packages/core/src/types/network/
└── agentx/          → packages/core/src/types/agentx/
```

**平台检查：** 全部是 .d.ts 和 interface，零平台依赖 ✅

---

### Module 2: common

**Step 2.1: 迁移类型**

```
packages/common/src/types/ → packages/core/src/types/common/
```

**Step 2.2: 迁移实现（需要拆分）**

| 文件    | 平台依赖                  | 处理方式              |
| ------- | ------------------------- | --------------------- |
| logger/ | ✅ 无                     | → core/common/logger/ |
| id/     | ✅ 无                     | → core/common/id/     |
| path/   | ❌ node:path              | 抽象 PathSPI          |
| sqlite/ | ❌ bun:sqlite/node:sqlite | 抽象 → node/sqlite/   |

**path 的处理：**

```typescript
// core/spi/PathSPI.ts - 接口
export interface PathSPI {
  join(...paths: string[]): string;
  dirname(path: string): string;
  resolve(...paths: string[]): string;
}

// node/path/NodePath.ts - 实现
import { join, dirname, resolve } from "node:path";
export const nodePath: PathSPI = { join, dirname, resolve };

// cloudflare/path/CFPath.ts - 实现（纯 JS polyfill）
export const cfPath: PathSPI = {
  join: (...paths) => paths.join("/").replace(/\/+/g, "/"),
  // ...
};
```

---

### Module 3: persistence

**Step 3.1: 迁移类型**

```
packages/persistence/src/
├── Persistence.ts (interface)     → core/spi/Persistence.ts
└── repository/*.ts (interfaces)   → core/spi/repository/
```

**Step 3.2: 迁移实现**

| 文件                 | 平台依赖        | 处理方式                 |
| -------------------- | --------------- | ------------------------ |
| repository/\*Impl.ts | ✅ 纯 unstorage | → core/persistence/      |
| drivers/memory.ts    | ✅ 无           | → core/drivers/memory.ts |
| drivers/sqlite.ts    | ❌ bun:sqlite   | → node/drivers/sqlite.ts |
| drivers/redis.ts     | ❌ ioredis      | → node/drivers/redis.ts  |

---

### Module 4: queue

**Step 4.1: 迁移类型**

```
packages/queue/src/types/ → core/types/queue/
```

**Step 4.2: 迁移实现**

| 文件                    | 平台依赖   | 处理方式      |
| ----------------------- | ---------- | ------------- |
| Queue.ts (RxJS Subject) | ✅ 纯 RxJS | → core/queue/ |
| InMemoryQueue.ts        | ✅ 无      | → core/queue/ |
| SqliteQueue.ts          | ❌ SQLite  | → node/queue/ |

---

### Module 5: network

**Step 5.1: 迁移类型**

```
packages/network/src/
├── types.ts → core/types/network/
└── protocol/ → core/types/network/protocol/
```

**Step 5.2: 迁移实现**

| 文件                             | 平台依赖      | 处理方式                 |
| -------------------------------- | ------------- | ------------------------ |
| client/BrowserWebSocketClient.ts | ✅ 浏览器原生 | → core/network/client/   |
| server/WebSocketServer.ts        | ❌ ws 包      | → node/network/          |
| server/WebSocketConnection.ts    | ❌ ws 包      | → node/network/          |
| protocol/reliable-message.ts     | ✅ 纯 JS      | → core/network/protocol/ |

**抽象 ChannelServerSPI：**

```typescript
// core/spi/ChannelServerSPI.ts
export interface ChannelServerSPI {
  onConnection(handler: (conn: ChannelConnection) => void): Unsubscribe;
  broadcast(message: string): void;
  close(): Promise<void>;
}

// node/network/NodeChannelServer.ts
import { WebSocketServer } from "ws";
export class NodeChannelServer implements ChannelServerSPI { ... }

// cloudflare/network/DOChannelServer.ts
export class DOChannelServer implements ChannelServerSPI { ... }
```

---

### Module 6: agent

**Step 6.1: 迁移类型**

```
packages/agent/src/types/ → core/types/agent/
```

**Step 6.2: 迁移实现**

| 文件            | 平台依赖   | 处理方式      |
| --------------- | ---------- | ------------- |
| AgentEngine.ts  | ✅ 纯 RxJS | → core/agent/ |
| MessageQueue.ts | ✅ 纯 TS   | → core/agent/ |
| StateMachine.ts | ✅ 纯 TS   | → core/agent/ |
| interceptors/   | ✅ 纯 TS   | → core/agent/ |

**检查：** agent 包应该全部是平台无关的 ✅

---

### Module 7: runtime

**Step 7.1: 迁移类型**

```
packages/runtime/src/types/ → core/types/runtime/
```

**Step 7.2: 迁移实现（需要仔细拆分）**

| 文件                             | 平台依赖           | 处理方式        |
| -------------------------------- | ------------------ | --------------- |
| SystemBusImpl.ts                 | ✅ 纯 RxJS         | → core/bus/     |
| RuntimeImpl.ts                   | ⚠️ 检查            | 拆分            |
| environment/ClaudeEnvironment.ts | ⚠️ 检查 Claude SDK | 可能需要抽象    |
| internal/RuntimeSession.ts       | ✅ 纯逻辑          | → core/runtime/ |
| internal/RuntimeContainer.ts     | ⚠️ 检查            | 拆分            |

**Claude SDK 的处理：**

```typescript
// Claude SDK 是 HTTP 调用，理论上平台无关
// 但需要验证在 Cloudflare Workers 中能否工作
// 如果不行，抽象为 LLMProviderSPI
```

---

## Migration Execution Order

按依赖顺序，从底向上：

```
Phase 1: Foundation
  1.1 types → core/types/        # 纯类型，无依赖
  1.2 common → core/common/      # 拆分平台相关部分
      └── path, sqlite → 抽象 SPI

Phase 2: Infrastructure
  2.1 persistence → core/spi/ + core/persistence/ + node/drivers/
  2.2 queue → core/queue/ + node/queue/
  2.3 network → core/network/ + node/network/
      └── 定义 ChannelServerSPI

Phase 3: Core Logic
  3.1 agent → core/agent/        # 应该全部平台无关
  3.2 runtime → core/runtime/ + node/runtime/
      └── 拆分 Claude 相关、MCP 相关

Phase 4: Entry Point
  4.1 更新 agentxjs
  4.2 创建 node provider
  4.3 创建 cloudflare provider

Phase 5: Cleanup
  5.1 删除旧包
  5.2 更新文档
```

---

## Package Structure (Final)

```
packages/
├── core/                        # @agentxjs/core
│   ├── src/
│   │   ├── types/              # All type definitions
│   │   │   ├── agent/
│   │   │   ├── event/
│   │   │   ├── runtime/
│   │   │   └── agentx/
│   │   ├── common/             # Platform-agnostic utilities
│   │   │   ├── logger/
│   │   │   ├── id/
│   │   │   └── index.ts
│   │   ├── spi/                # Service Provider Interfaces
│   │   │   ├── AgentXProvider.ts
│   │   │   ├── ChannelServerSPI.ts
│   │   │   ├── SchedulerSPI.ts
│   │   │   ├── PersistenceDriverSPI.ts
│   │   │   └── index.ts
│   │   ├── agent/              # Agent core logic
│   │   │   ├── AgentEngine.ts
│   │   │   ├── MessageQueue.ts
│   │   │   └── StateMachine.ts
│   │   ├── bus/                # Event bus
│   │   │   ├── SystemBusImpl.ts
│   │   │   └── index.ts
│   │   ├── queue/              # Event queue (RxJS)
│   │   └── index.ts
│   └── package.json
│
├── node/                        # @agentxjs/node
│   ├── src/
│   │   ├── NodeProvider.ts     # Provider implementation
│   │   ├── network/            # WebSocket (ws package)
│   │   │   ├── NodeChannelServer.ts
│   │   │   └── NodeChannelConnection.ts
│   │   ├── drivers/            # Persistence drivers
│   │   │   ├── sqlite.ts
│   │   │   ├── redis.ts
│   │   │   ├── memory.ts
│   │   │   └── index.ts
│   │   ├── scheduler/          # NodeScheduler
│   │   └── index.ts
│   └── package.json
│
├── cloudflare/                  # @agentxjs/cloudflare
│   ├── src/
│   │   ├── CloudflareProvider.ts
│   │   ├── AgentDurableObject.ts
│   │   ├── DOChannelServer.ts
│   │   ├── DOScheduler.ts
│   │   ├── drivers/
│   │   │   └── d1.ts
│   │   └── index.ts
│   └── package.json
│
├── agentx/                      # agentxjs (user entry)
│   ├── src/
│   │   ├── createAgentX.ts
│   │   ├── createLocalAgentX.ts
│   │   ├── createRemoteAgentX.ts
│   │   └── index.ts            # Re-export common types
│   └── package.json
│
└── ui/                          # @agentxjs/ui (unchanged)
    └── ...
```

---

## Dependency Graph (Final)

```
@agentxjs/core (platform-agnostic, includes types)
    ↑
    ├── @agentxjs/node (Node.js platform)
    ├── @agentxjs/cloudflare (Cloudflare platform)
    └── agentxjs (user API, re-exports types)
              ↑
              └── @agentxjs/ui (React components)
```

**5 packages total:**

1. `@agentxjs/core` - 核心 + 类型 + SPI
2. `@agentxjs/node` - Node.js 平台适配
3. `@agentxjs/cloudflare` - Cloudflare 平台适配
4. `agentxjs` - 用户入口
5. `@agentxjs/ui` - React UI

**Key principle:** Core has ZERO platform-specific imports. All `ws`, `bun:sqlite`, `node:*` imports are in platform packages.

---

## Acceptance Criteria

### Functional

- [ ] `createAgentX({ provider: nodeProvider() })` works
- [ ] `createAgentX({ provider: cloudflareProvider(env) })` works
- [ ] `createAgentX({ serverUrl })` works (browser remote mode)
- [ ] All existing tests pass
- [ ] BDD tests pass

### Architecture

- [ ] @agentxjs/core has zero platform-specific imports
- [ ] @agentxjs/node contains all Node.js dependencies
- [ ] @agentxjs/cloudflare deploys to Workers
- [ ] Tree-shaking works (unused platform code excluded)

### Developer Experience

- [ ] Clear error if provider missing in local mode
- [ ] TypeScript types work correctly
- [ ] Documentation updated
- [ ] Migration guide for existing users

---

## Cloudflare Workers Specifics

### Durable Objects for State

```typescript
// @agentxjs/cloudflare/src/AgentDurableObject.ts
export class AgentDurableObject implements DurableObject {
  private bus: SystemBus;
  private agentEngine: AgentEngine;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.bus = new SystemBusImpl();
    // ... initialize
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.handleWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    // Handle HTTP requests
  }

  private handleWebSocket(ws: WebSocket): void {
    this.state.acceptWebSocket(ws);
    // ... handle messages
  }

  // Hibernation support
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    // Handle message after hibernation wake
  }

  async alarm(): Promise<void> {
    // Scheduled task (replaces setInterval)
  }
}
```

### D1 Persistence Driver

```typescript
// @agentxjs/cloudflare/src/drivers/d1.ts
export function d1Driver(db: D1Database): PersistenceDriver {
  return {
    async createStorage() {
      // D1-backed storage implementation
    },
  };
}
```

---

## Tasks

### Phase 1: Core Package

- [ ] Create packages/core/ directory structure
- [ ] Migrate types package → core/types
- [ ] Migrate common package → core/common (platform-agnostic parts)
- [ ] Define SPI interfaces in core/spi
- [ ] Migrate agent package → core/agent
- [ ] Migrate queue (RxJS parts) → core/queue
- [ ] Migrate bus → core/bus
- [ ] Configure package.json and exports
- [ ] Verify build and tests pass

### Phase 2: Node Package

- [ ] Create packages/node/ directory structure
- [ ] Migrate network package → node/network
- [ ] Migrate persistence drivers → node/drivers
- [ ] Migrate queue (SQLite) → node/queue
- [ ] Implement NodeProvider
- [ ] Implement NodeScheduler
- [ ] Configure package.json
- [ ] Verify build and tests pass

### Phase 3: Cloudflare Package

- [ ] Create packages/cloudflare/ directory structure
- [ ] Implement AgentDurableObject
- [ ] Implement DOChannelServer (WebSocketPair)
- [ ] Implement d1Driver
- [ ] Implement DOScheduler (alarm-based)
- [ ] Implement CloudflareProvider
- [ ] Create example wrangler.toml
- [ ] Test deployment to Workers

### Phase 4: Update Entry Points

- [ ] Update agentxjs to require provider
- [ ] Update createAgentX factory
- [ ] Re-export common types from agentxjs
- [ ] Update documentation

### Phase 5: Cleanup

- [ ] Remove old packages (types, common, persistence, queue, network, agent, runtime)
- [ ] Update all internal imports
- [ ] Update CLAUDE.md
- [ ] Create migration guide
- [ ] Release new versions

---

## References

- ResourceX architecture: `/Users/sean/Deepractice/AgentX/temp/ResourceX`
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- WebSocket Hibernation: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation/
- D1 Database: https://developers.cloudflare.com/d1/
