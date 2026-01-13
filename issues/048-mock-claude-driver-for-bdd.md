# 048 - Mock Claude Driver for BDD Tests

**状态**: 设计中
**优先级**: High
**创建时间**: 2026-01-12
**标签**: `testing`, `bdd`, `architecture`

---

## 问题背景

当前 BDD 测试存在三个问题：

1. **不调用 API** → 无法测试完整事件流（text_delta, assistant_message 等）
2. **调用真实 API** → 慢（需等待 LLM）、费钱、结果不可预测
3. **模拟状态** → 只能改变量，不能真实验证 Agent → Queue → Client 的端到端流程

**现状**：

- Layer 1 基础测试: 24/25 pass (96%) ✅ - 不需要 LLM
- Layer 2 可靠性测试: 14/27 pass (52%) ⚠️ - 需要消息流

**核心需求**：
需要一个 **可预测、快速** 的 Mock Driver，能够：

- 发出完整的事件序列（message_start → text_delta → tool_call → message_stop）
- 支持不同场景（成功、错误、中断）
- 在 BDD 测试中可注入、可切换

---

## 设计方案

### 1. Driver 接口抽象

```typescript
// packages/runtime/src/llm/Driver.ts
export interface LLMDriver {
  /**
   * Send message to LLM and stream events
   */
  sendMessage(params: {
    messages: Message[];
    system?: string;
    model?: string;
    maxTokens?: number;
    onEvent: (event: LLMEvent) => void;
  }): Promise<void>;

  /**
   * Interrupt current message generation
   */
  interrupt(): void;
}

export type LLMEvent =
  | MessageStartEvent
  | TextDeltaEvent
  | ToolCallEvent
  | ToolResultEvent
  | MessageStopEvent
  | ErrorEvent;
```

### 2. Mock Driver 实现

```typescript
// bdd/mock/MockClaudeDriver.ts
export class MockClaudeDriver implements LLMDriver {
  private scenarios = new Map<string, LLMEvent[]>();
  private currentScenario: string = "default";

  constructor() {
    // 预定义场景
    this.scenarios.set("default", [
      { type: "message_start", ... },
      { type: "text_delta", data: { text: "Hello" } },
      { type: "text_delta", data: { text: " from" } },
      { type: "text_delta", data: { text: " mock!" } },
      { type: "message_stop", ... },
    ]);

    this.scenarios.set("with-tool", [
      { type: "message_start", ... },
      { type: "text_delta", data: { text: "Let me" } },
      { type: "tool_call", data: { name: "bash", input: "ls" } },
      { type: "message_stop", ... },
    ]);

    this.scenarios.set("error", [
      { type: "message_start", ... },
      { type: "error", data: { message: "Rate limit exceeded" } },
    ]);
  }

  async sendMessage(params: { onEvent: (event: LLMEvent) => void }): Promise<void> {
    const events = this.scenarios.get(this.currentScenario) || [];

    // 模拟异步流式输出（10ms 延迟）
    for (const event of events) {
      await new Promise((r) => setTimeout(r, 10));
      params.onEvent(event);
    }
  }

  interrupt(): void {
    // Mock 直接忽略
  }

  // BDD 测试辅助方法
  setScenario(name: string): void {
    this.currentScenario = name;
  }

  defineScenario(name: string, events: LLMEvent[]): void {
    this.scenarios.set(name, events);
  }
}
```

### 3. 注入机制

**方案 A：通过 LLM 配置注入（推荐）**

```typescript
// bdd/steps/world.ts
export class AgentXWorld extends World {
  async setupMockDriver() {
    const mockDriver = new MockClaudeDriver();

    this.agentx = await createAgentX({
      llm: {
        driver: mockDriver, // 注入 Mock Driver
      },
    });

    // 保存 mock driver 引用以便后续控制
    this.mockDriver = mockDriver;
  }
}

// bdd/features/conversation/message-flow.feature
Scenario: Send message triggers stream events
  Given an AgentX instance with mock driver
  And mock driver scenario is "default"
  And I am subscribed to "text_delta" events
  When I send message "Hello" to image "chat"
  Then I should receive 3 "text_delta" events
  And text should be "Hello from mock!"
```

**方案 B：环境变量切换**

```typescript
// packages/runtime/src/llm/factory.ts
export function createDriver(config: LLMConfig): LLMDriver {
  if (process.env.AGENTX_MOCK_LLM === "true") {
    return new MockClaudeDriver();
  }
  return new ClaudeDriver(config);
}

// bdd/test-server.ts
const agentx = await createAgentX({
  agentxDir: AGENTX_DIR,
  llm: {
    mock: true, // 或者读取 process.env.AGENTX_MOCK_LLM
  },
});
```

### 4. Driver 工厂模式（最灵活）

```typescript
// packages/types/src/llm/LLMProvider.ts
export interface LLMProvider {
  name: string;
  provide(): LLMDriver | Promise<LLMDriver>;
}

// packages/runtime/src/createRuntimeImpl.ts
export async function createRuntimeImpl(config: {
  llmProvider?: LLMProvider; // 自定义 provider
  // ...
}) {
  const driver = config.llmProvider
    ? await config.llmProvider.provide()
    : await createClaudeDriver(config.llm);

  // ...
}

// bdd/mock/MockLLMProvider.ts
export const MockLLMProvider: LLMProvider = {
  name: "mock",
  provide: () => new MockClaudeDriver(),
};

// BDD 使用
const agentx = await createAgentX({
  llmProvider: MockLLMProvider, // 注入
});
```

---

## 使用场景

### Layer 1: 基础消息流测试

```gherkin
Scenario: Message triggers complete stream events
  Given an AgentX instance with mock driver
  And I am subscribed to stream events
  When I send "Hello" to image "chat"
  Then I should receive events in order:
    | message_start  |
    | text_delta     |
    | message_stop   |
```

### Layer 2: 可靠性测试（真实端到端）

```gherkin
Scenario: Disconnect during streaming recovers messages
  Given a remote client subscribed to "chat"
  And mock driver scenario is "long-response" (100 text_delta events)
  When client sends message "Tell me a story"
  And mock driver emits 50 text_delta events
  And client disconnects
  And mock driver continues emitting 50 more events
  And client reconnects
  Then client should receive all 100 text_delta events
  And no events should be lost
```

### 多场景支持

```typescript
// bdd/mock/scenarios.ts
export const SCENARIOS = {
  "simple-text": [
    { type: "message_start" },
    { type: "text_delta", data: { text: "Hi" } },
    { type: "message_stop" },
  ],

  "with-thinking": [
    { type: "message_start" },
    { type: "thinking_start" },
    { type: "text_delta", data: { text: "Let me think..." } },
    { type: "thinking_end" },
    { type: "text_delta", data: { text: "Answer" } },
    { type: "message_stop" },
  ],

  "with-tool-use": [
    { type: "message_start" },
    { type: "tool_call", data: { name: "bash", input: "ls" } },
    { type: "tool_result", data: { output: "file1.txt\nfile2.txt" } },
    { type: "text_delta", data: { text: "I see 2 files" } },
    { type: "message_stop" },
  ],

  "rate-limit-error": [
    { type: "message_start" },
    { type: "error", data: { code: "rate_limit_exceeded" } },
  ],
};
```

---

## 实现计划

### Phase 1: 基础架构

- [ ] **定义 LLMDriver 接口**
  - 文件：`packages/types/src/llm/Driver.ts`
  - 定义标准事件类型（LLMEvent union）

- [ ] **抽象 ClaudeDriver**
  - 文件：`packages/runtime/src/llm/ClaudeDriver.ts`
  - 实现 LLMDriver 接口
  - 保持现有逻辑不变

- [ ] **Driver 工厂模式**
  - 文件：`packages/runtime/src/createRuntimeImpl.ts`
  - 支持 `llmProvider: LLMProvider` 配置
  - 默认使用 ClaudeDriver

### Phase 2: Mock Driver 实现

- [ ] **MockClaudeDriver**
  - 文件：`bdd/mock/MockClaudeDriver.ts`
  - 实现 LLMDriver 接口
  - 支持场景切换
  - 支持流式延迟（可配置）

- [ ] **预定义场景**
  - 文件：`bdd/mock/scenarios.ts`
  - 定义常用测试场景
  - 导出场景常量

### Phase 3: BDD 集成

- [ ] **更新 test-server.ts**
  - 支持 `MOCK_LLM=true` 环境变量
  - 使用 MockLLMProvider

- [ ] **World 辅助方法**
  - 文件：`bdd/steps/world.ts`
  - `setupMockDriver(scenario?: string)`
  - `setMockScenario(name: string)`

- [ ] **新增 step definitions**
  - `Given mock driver scenario is {string}`
  - `Then I should receive events in order:`
  - `Then text should be {string}`

### Phase 4: 可靠性测试重写

- [ ] **重写 Layer 2 feature**
  - 使用真实 Agent → Queue → Client 流程
  - 验证消息不丢失、顺序正确
  - 验证多消费者隔离

- [ ] **Stress 测试**
  - 1000 条消息场景
  - 多客户端并发
  - 快速断线重连

---

## 技术细节

### Driver 注入点

当前（推测）：

```typescript
// packages/runtime/src/createRuntimeImpl.ts
const driver = new ClaudeDriver({
  apiKey: config.llm.apiKey,
  model: config.llm.model,
});
```

改为：

```typescript
const driver = config.llmProvider
  ? await config.llmProvider.provide()
  : new ClaudeDriver(config.llm);
```

### Mock Event 生成

```typescript
class MockClaudeDriver {
  private async *streamEvents(scenario: LLMEvent[]): AsyncGenerator<LLMEvent> {
    for (const event of scenario) {
      await new Promise((r) => setTimeout(r, this.delay));
      yield event;
    }
  }

  async sendMessage(params: { onEvent: (event: LLMEvent) => void }): Promise<void> {
    const events = this.scenarios.get(this.currentScenario) || DEFAULT_SCENARIO;

    for await (const event of this.streamEvents(events)) {
      params.onEvent(event);
    }
  }
}
```

### BDD 测试示例

```gherkin
@integration @mock
Scenario: Complete conversation flow with mock driver
  Given an AgentX instance with mock driver
  And container "workspace" exists
  And image "chat" exists in container "workspace"
  And mock driver scenario is "simple-text"
  And I am subscribed to events for image "chat"

  When I call agentx.request("message_send_request", { imageId: "chat", content: "Hello" })

  Then I should receive "message_send_response"
  And I should receive events in order:
    | message_start |
    | text_delta    |
    | text_delta    |
    | text_delta    |
    | message_stop  |
  And I should receive "assistant_message" event
  And assistant message content should contain "Hello from mock!"
```

---

## 优势

1. **快速** - 10ms/event vs 秒级 API 调用
2. **可预测** - 固定场景，结果确定
3. **完整** - 测试真实的 Agent → Queue → Client 路径
4. **隔离** - 不依赖外部服务
5. **成本** - 零 API 费用

## 兼容性

- ✅ 不影响现有 API
- ✅ 可选功能（通过配置启用）
- ✅ 生产代码零修改（只添加抽象层）
- ✅ BDD 独立实现（在 bdd/ 目录）

---

## 相关 Issue

- #046 - Queue MQ Architecture（本次架构重构）
- #047 - Unified Development Mode（Code Review + BDD）

---

## Next Steps

1. **研究 Driver 架构** - 找到注入点
2. **设计 LLMDriver 接口** - 定义标准契约
3. **实现 MockClaudeDriver** - BDD 包内实现
4. **更新 BDD 测试** - 使用 Mock Driver 重写 @integration 测试
