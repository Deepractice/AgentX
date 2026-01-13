# 048 - Mock Environment for BDD Tests

**状态**: 设计中
**优先级**: High
**创建时间**: 2026-01-12
**标签**: `testing`, `bdd`, `architecture`

---

## 问题背景

当前 BDD 测试存在局限：

1. **不调用 API** → 无法测试完整事件流（text_delta, assistant_message 等）
2. **调用真实 API** → 慢、费钱、结果不可预测
3. **模拟状态** → 只能改变量，不能验证 Agent → Queue → Client 端到端流程

**现状**：

- Layer 1 基础测试: 24/25 pass (96%) ✅ - 不需要 LLM
- Layer 2 可靠性测试: 14/27 pass (52%) ⚠️ - 需要消息流

**目标**：创建 **可预测、快速** 的 Mock Environment，能在 BDD 测试中注入。

---

## 真实架构分析

### AgentX 不使用 "Driver" 模式，而是 **Environment 模式**

**架构图**：

```
RuntimeAgent
    ↓
ClaudeEnvironment
    ├── ClaudeReceptor (SDK → SystemBus)
    │       ↓
    │   feed(sdkMsg) → emitToBus(event)
    │
    └── ClaudeEffector (SystemBus → SDK)
            ↓
        SDKQueryLifecycle → query() → Claude SDK
```

**核心接口** (已存在，无需修改)：

```typescript
// packages/types/src/runtime/internal/environment/Environment.ts:47
export interface Environment {
  readonly name: string;
  readonly receptor: Receptor;
  readonly effector: Effector;
}

// Receptor.ts:32 - 接收外部事件，发送到 SystemBus
export interface Receptor {
  connect(producer: SystemBusProducer): void;
}

// Effector.ts:32 - 监听 SystemBus，执行外部操作
export interface Effector {
  connect(consumer: SystemBusConsumer): void;
}
```

**当前实现**：

```typescript
// packages/runtime/src/environment/ClaudeEnvironment.ts:23
export class ClaudeEnvironment implements Environment {
  readonly name = "claude";
  readonly receptor: Receptor;
  readonly effector: Effector;

  constructor(config: ClaudeEnvironmentConfig) {
    const claudeReceptor = new ClaudeReceptor();
    const claudeEffector = new ClaudeEffector(config, claudeReceptor);

    this.receptor = claudeReceptor;
    this.effector = claudeEffector;
  }
}
```

**Agent 创建 Environment** (RuntimeAgent.ts:243)：

```typescript
this.environment = new ClaudeEnvironment({
  agentId: this.agentId,
  apiKey: config.llmConfig.apiKey,
  baseUrl: config.llmConfig.baseUrl,
  model: config.llmConfig.model,
  systemPrompt: config.image.systemPrompt,
  cwd: config.sandbox.workdir.path,
  resumeSessionId,
  mcpServers: config.image.mcpServers,
  onSessionIdCaptured: (sdkSessionId) => {
    this.saveSessionId(sdkSessionId);
  },
});

// 连接到 SystemBus
this.environment.receptor.connect(config.bus.asProducer());
this.environment.effector.connect(config.bus.asConsumer());
```

**关键发现**：

- ❌ RuntimeConfig 有 `environment?: Environment` 字段但**从未使用**
- ✅ Environment 接口已完善
- ✅ 每个 Agent 独立创建 Environment
- 🎯 需要支持 **Environment 工厂模式**

---

## 设计方案

### 1. Environment 工厂模式

**新增配置** (packages/types/src/runtime/RuntimeConfig.ts)：

```typescript
export interface EnvironmentFactory {
  create(config: {
    agentId: string;
    llmConfig: ClaudeLLMConfig;
    systemPrompt?: string;
    cwd: string;
    resumeSessionId?: string;
    mcpServers?: Record<string, any>;
    onSessionIdCaptured?: (sessionId: string) => void;
  }): Environment;
}

export interface RuntimeConfig {
  // ...existing fields...

  /**
   * Optional environment factory for dependency injection (e.g., mock for testing)
   * If not provided, ClaudeEnvironment will be created by default
   */
  environmentFactory?: EnvironmentFactory;
}
```

**修改 RuntimeAgent** (packages/runtime/src/internal/RuntimeAgent.ts:243)：

```typescript
// 原来：
this.environment = new ClaudeEnvironment({ ... });

// 改为：
const factory = config.environmentFactory ?? defaultEnvironmentFactory;
this.environment = factory.create({
  agentId: this.agentId,
  llmConfig: config.llmConfig,
  systemPrompt: config.image.systemPrompt,
  cwd: config.sandbox.workdir.path,
  resumeSessionId,
  mcpServers: config.image.mcpServers,
  onSessionIdCaptured: (sdkSessionId) => {
    this.saveSessionId(sdkSessionId);
  },
});
```

**默认工厂**：

```typescript
// packages/runtime/src/environment/factories.ts
export const defaultEnvironmentFactory: EnvironmentFactory = {
  create: (config) => new ClaudeEnvironment(config),
};
```

### 2. MockEnvironment 实现

**文件结构**：

```
bdd/mock/
├── MockEnvironment.ts       # 主入口
├── MockReceptor.ts          # 模拟接收器
├── MockEffector.ts          # 模拟执行器
├── scenarios.ts             # 预定义场景
└── index.ts                 # 导出
```

**MockEnvironment** (bdd/mock/MockEnvironment.ts)：

```typescript
import type { Environment, Receptor, Effector } from "@agentxjs/types/runtime/internal/environment";

export interface MockScenario {
  name: string;
  events: MockEvent[];
}

export interface MockEvent {
  type: string;
  delay?: number; // ms delay before emitting
  data?: unknown;
}

export class MockEnvironment implements Environment {
  readonly name = "mock";
  readonly receptor: MockReceptor;
  readonly effector: MockEffector;

  constructor(config: {
    agentId: string;
    scenario?: string;
    scenarios?: Map<string, MockScenario>;
  }) {
    this.receptor = new MockReceptor();
    this.effector = new MockEffector({
      agentId: config.agentId,
      receptor: this.receptor,
      scenario: config.scenario || "default",
      scenarios: config.scenarios || PREDEFINED_SCENARIOS,
    });
  }

  // 测试辅助方法
  setScenario(name: string): void {
    this.effector.setScenario(name);
  }

  dispose(): void {
    this.effector.dispose();
  }
}
```

**MockReceptor** (bdd/mock/MockReceptor.ts)：

```typescript
import type { Receptor, SystemBusProducer } from "@agentxjs/types/runtime/internal";

export class MockReceptor implements Receptor {
  private producer: SystemBusProducer | null = null;

  connect(producer: SystemBusProducer): void {
    this.producer = producer;
  }

  /**
   * Emit mock event to SystemBus
   * Called by MockEffector to simulate SDK events
   */
  emit(event: SystemEvent): void {
    if (this.producer) {
      this.producer.emit(event);
    }
  }
}
```

**MockEffector** (bdd/mock/MockEffector.ts)：

```typescript
import type { Effector, SystemBusConsumer } from "@agentxjs/types/runtime/internal";
import type { MockReceptor } from "./MockReceptor";
import type { MockScenario } from "./MockEnvironment";

export class MockEffector implements Effector {
  private agentId: string;
  private receptor: MockReceptor;
  private currentScenario: string;
  private scenarios: Map<string, MockScenario>;
  private unsubscribe?: () => void;

  constructor(config: {
    agentId: string;
    receptor: MockReceptor;
    scenario: string;
    scenarios: Map<string, MockScenario>;
  }) {
    this.agentId = config.agentId;
    this.receptor = config.receptor;
    this.currentScenario = config.scenario;
    this.scenarios = config.scenarios;
  }

  connect(consumer: SystemBusConsumer): void {
    // 监听 user_message 事件
    this.unsubscribe = consumer.on("user_message", async (event) => {
      // 过滤：只处理属于当前 Agent 的消息
      if (event.context?.agentId !== this.agentId) {
        return;
      }

      // 模拟异步处理
      await this.processUserMessage(event);
    });
  }

  private async processUserMessage(event: SystemEvent): Promise<void> {
    const scenario = this.scenarios.get(this.currentScenario);
    if (!scenario) {
      console.warn(`Mock scenario "${this.currentScenario}" not found`);
      return;
    }

    // 依次发出预定义事件
    for (const mockEvent of scenario.events) {
      // 延迟（模拟真实流式输出）
      if (mockEvent.delay) {
        await new Promise((r) => setTimeout(r, mockEvent.delay));
      }

      // 发送到 SystemBus
      this.receptor.emit({
        type: mockEvent.type,
        timestamp: Date.now(),
        data: mockEvent.data,
        source: "environment",
        category: "stream", // 或根据 type 推断
        intent: "notification",
        context: event.context, // 继承上下文
      } as SystemEvent);
    }
  }

  setScenario(name: string): void {
    this.currentScenario = name;
  }

  dispose(): void {
    this.unsubscribe?.();
  }
}
```

### 3. 预定义场景

**文件** (bdd/mock/scenarios.ts)：

```typescript
import type { MockScenario } from "./MockEnvironment";

export const PREDEFINED_SCENARIOS = new Map<string, MockScenario>([
  [
    "default",
    {
      name: "Simple text response",
      events: [
        { type: "message_start", delay: 10 },
        { type: "text_delta", data: { text: "Hello" }, delay: 10 },
        { type: "text_delta", data: { text: " from" }, delay: 10 },
        { type: "text_delta", data: { text: " mock!" }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "with-thinking",
    {
      name: "Response with thinking",
      events: [
        { type: "message_start", delay: 10 },
        { type: "thinking_start", delay: 5 },
        { type: "text_delta", data: { text: "Let me analyze..." }, delay: 10 },
        { type: "thinking_end", delay: 5 },
        { type: "text_delta", data: { text: "Answer" }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "with-tool",
    {
      name: "Tool use scenario",
      events: [
        { type: "message_start", delay: 10 },
        { type: "text_delta", data: { text: "Let me check" }, delay: 10 },
        { type: "tool_call", data: { name: "bash", input: { command: "ls" } }, delay: 20 },
        // Tool result would come from user (not in mock)
        { type: "text_delta", data: { text: "I found files" }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "error",
    {
      name: "Error scenario",
      events: [
        { type: "message_start", delay: 10 },
        { type: "error", data: { message: "Rate limit exceeded" }, delay: 20 },
      ],
    },
  ],

  [
    "long-stream",
    {
      name: "100 text deltas for reliability testing",
      events: Array.from({ length: 100 }, (_, i) => ({
        type: "text_delta",
        data: { text: `chunk-${i} ` },
        delay: 5,
      })).concat([{ type: "message_stop", delay: 10 }]),
    },
  ],
]);
```

### 4. 注入机制

**修改 RuntimeConfig** (packages/types/src/runtime/RuntimeConfig.ts)：

```typescript
export interface RuntimeConfig {
  persistence: Persistence;
  llmProvider: LLMProvider<ClaudeLLMConfig>;
  basePath: string;

  /**
   * Optional environment factory for dependency injection
   * Useful for mocking in tests
   */
  environmentFactory?: EnvironmentFactory;

  defaultAgent?: AgentDefinition;
}

export interface EnvironmentFactory {
  create(config: EnvironmentCreateConfig): Environment;
}

export interface EnvironmentCreateConfig {
  agentId: string;
  llmConfig: ClaudeLLMConfig;
  systemPrompt?: string;
  cwd: string;
  resumeSessionId?: string;
  mcpServers?: Record<string, any>;
  onSessionIdCaptured?: (sessionId: string) => void;
}
```

**修改 RuntimeAgent** (packages/runtime/src/internal/RuntimeAgent.ts:243)：

```typescript
// 使用工厂创建 Environment（支持注入）
const factory = config.environmentFactory ?? {
  create: (envConfig) => new ClaudeEnvironment(envConfig),
};

this.environment = factory.create({
  agentId: this.agentId,
  llmConfig: config.llmConfig,
  systemPrompt: config.image.systemPrompt,
  cwd: config.sandbox.workdir.path,
  resumeSessionId,
  mcpServers: config.image.mcpServers,
  onSessionIdCaptured: (sdkSessionId) => {
    this.saveSessionId(sdkSessionId);
  },
});

// 连接到 SystemBus
this.environment.receptor.connect(config.bus.asProducer());
this.environment.effector.connect(config.bus.asConsumer());
```

**传递配置** (packages/runtime/src/createRuntime.ts)：

```typescript
export interface PublicRuntimeConfig {
  // ...existing...
  environmentFactory?: EnvironmentFactory; // 新增
}

export async function createRuntime(config: PublicRuntimeConfig) {
  return new RuntimeImpl({
    persistence,
    llmProvider,
    basePath,
    environmentFactory: config.environmentFactory, // 传递
    defaultAgent: config.defaultAgent,
  });
}
```

**AgentX 入口** (packages/agentx/src/createLocalAgentX.ts)：

```typescript
export interface LocalConfig {
  llm?: { apiKey?: string; baseUrl?: string; model?: string };
  logger?: LoggerConfig;
  agentxDir?: string;
  defaultAgent?: AgentDefinition;
  server?: Server;

  // 新增：测试专用
  environmentFactory?: EnvironmentFactory;
}

const runtime = await createRuntime({
  persistence,
  basePath,
  llmProvider,
  environmentFactory: config.environmentFactory, // 传递
  defaultAgent: config.defaultAgent,
});
```

---

## BDD 集成

### MockEnvironmentFactory (bdd/mock/MockEnvironmentFactory.ts)

```typescript
import type { EnvironmentFactory } from "@agentxjs/types/runtime";
import { MockEnvironment } from "./MockEnvironment";
import { PREDEFINED_SCENARIOS } from "./scenarios";

export class MockEnvironmentFactory implements EnvironmentFactory {
  private currentScenario: string = "default";
  private scenarios = PREDEFINED_SCENARIOS;

  create(config: EnvironmentCreateConfig): Environment {
    return new MockEnvironment({
      agentId: config.agentId,
      scenario: this.currentScenario,
      scenarios: this.scenarios,
    });
  }

  // 测试控制方法
  setScenario(name: string): void {
    this.currentScenario = name;
  }

  defineScenario(name: string, scenario: MockScenario): void {
    this.scenarios.set(name, scenario);
  }
}
```

### World 更新 (bdd/steps/world.ts)

```typescript
export class AgentXWorld extends World {
  // ...existing fields...

  mockFactory?: MockEnvironmentFactory;

  async createMockAgentX(): Promise<void> {
    this.mockFactory = new MockEnvironmentFactory();

    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({
      environmentFactory: this.mockFactory,
    });
  }

  setMockScenario(name: string): void {
    this.mockFactory?.setScenario(name);
  }
}
```

### 新增 Step Definitions (bdd/steps/mock.steps.ts)

```typescript
Given("an AgentX instance with mock driver", async function (this: AgentXWorld) {
  await this.createMockAgentX();
});

Given(/^mock driver scenario is "([^"]+)"$/, function (this: AgentXWorld, scenario: string) {
  this.setMockScenario(scenario);
});

Then("I should receive events in order:", function (this: AgentXWorld, dataTable: DataTable) {
  const expectedTypes = dataTable.raw().map((row) => row[0]);
  const actualTypes = this.collectedEvents.map((e) => e.type);
  expect(actualTypes).toEqual(expectedTypes);
});

Then(/^text should be "([^"]+)"$/, function (this: AgentXWorld, expectedText: string) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  const fullText = textDeltas.map((e) => (e.data as { text: string }).text).join("");
  expect(fullText).toBe(expectedText);
});
```

### 测试服务器支持 (bdd/test-server.ts)

```typescript
import { MockEnvironmentFactory } from "./mock";

const useMock = process.env.MOCK_LLM === "true" || !apiKey;

const agentx = await createAgentX({
  agentxDir: AGENTX_DIR,
  logger: { level: "debug" },
  llm: apiKey ? { apiKey, model } : undefined,
  environmentFactory: useMock ? new MockEnvironmentFactory() : undefined,
});

console.log(`  Mode: ${useMock ? "Mock (fast)" : "Real API (slow)"}`);
```

---

## 使用示例

### Layer 1: 基础消息流

```gherkin
@message @mock
Scenario: Send message triggers stream events
  Given an AgentX instance with mock driver
  And container "workspace" exists
  And image "chat" exists in container "workspace"
  And mock driver scenario is "default"
  And I am subscribed to "text_delta" events

  When I call agentx.request("message_send_request", { imageId: "chat", content: "Hello" })

  Then I should receive "message_send_response"
  And I should receive "text_delta" events
  And I should receive "message_stop" event
  And text should be "Hello from mock!"
```

### Layer 2: 可靠性测试

```gherkin
@reliability @mock
Scenario: Disconnect during streaming recovers all messages
  Given an AgentX server with mock driver
  And a remote client subscribed to "chat"
  And mock driver scenario is "long-stream" (100 deltas)

  When client sends message "Test"
  And mock emits 50 text_delta events
  And client disconnects
  And mock continues emitting 50 more events
  And client reconnects

  Then client should receive all 100 text_delta events
  And events should be in order
  And no events should be lost
```

---

## 实现计划

### Phase 1: 架构改造 (核心包)

- [ ] 定义 `EnvironmentFactory` 接口 (packages/types/src/runtime/)
- [ ] 修改 `RuntimeConfig` 添加 `environmentFactory?` 字段
- [ ] 修改 `RuntimeAgent` 使用工厂创建 Environment
- [ ] 创建 `defaultEnvironmentFactory`
- [ ] 传递配置：createRuntime → RuntimeImpl → RuntimeContainer → RuntimeAgent

### Phase 2: Mock 实现 (bdd 包)

- [ ] 实现 `MockEnvironment` (bdd/mock/MockEnvironment.ts)
- [ ] 实现 `MockReceptor` (bdd/mock/MockReceptor.ts)
- [ ] 实现 `MockEffector` (bdd/mock/MockEffector.ts)
- [ ] 定义预设场景 (bdd/mock/scenarios.ts)
- [ ] 实现 `MockEnvironmentFactory` (bdd/mock/MockEnvironmentFactory.ts)

### Phase 3: BDD 集成

- [ ] 更新 `world.ts` 添加 mock 支持
- [ ] 添加 `mock.steps.ts` step definitions
- [ ] 更新 `test-server.ts` 支持 MOCK_LLM 环境变量
- [ ] 添加 @mock tagged scenarios

### Phase 4: 测试重写

- [ ] 重写 @integration 测试使用 @mock
- [ ] 新增完整消息流测试
- [ ] Layer 2 可靠性测试（真实端到端）

---

## 优势

1. **快速** - 10ms/event vs 秒级 API
2. **可预测** - 固定场景，确定结果
3. **完整** - 真实 Agent → Queue → Client 路径
4. **隔离** - 零外部依赖
5. **成本** - 零 API 费用
6. **灵活** - 自定义场景，支持各种测试用例

## 兼容性

- ✅ 不破坏现有 API
- ✅ 可选功能（默认使用 ClaudeEnvironment）
- ✅ 只添加抽象层，不修改业务逻辑
- ✅ Mock 实现在 bdd/ 包，不污染生产代码

---

## 相关 Issue

- #046 - Queue MQ Architecture
- #047 - Unified Development Mode (Code Review + BDD)

---

## 当前状态

- [x] 研究真实架构
- [x] 设计 MockEnvironment 方案
- [ ] 实现 Phase 1（架构改造）
- [ ] 实现 Phase 2（Mock）
- [ ] 实现 Phase 3（BDD 集成）
