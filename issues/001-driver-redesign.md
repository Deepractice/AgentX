# Driver 接口重新设计

## 背景

当前 Driver 设计存在问题：

1. Driver 通过 EventBus 通信，输入输出边界不清晰
2. resume、MCP 等配置与交互逻辑混在一起
3. 不利于 VCR 录制/回放测试

## 目标

重新设计 Driver 接口，使其：

1. 有清晰的输入输出边界（便于录制）
2. 职责单一：只负责单一 Session 的通信
3. 配置由我们定义（能力边界）

## 设计方案

### 概念对应

| 概念           | 职责                                         |
| -------------- | -------------------------------------------- |
| Session (上层) | 消息存储、历史管理、用户看到的"对话"         |
| Driver         | SDK 通信、单一会话、类似 Kimi SDK 的 Session |

### 核心接口 (@agentxjs/core)

```typescript
// DriverConfig - 我们定义的能力边界
interface DriverConfig {
  // Provider
  apiKey: string;
  baseUrl?: string;
  model?: string;

  // Agent
  agentId: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
  cwd?: string;

  // Session
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
}

// DriverState
type DriverState = "idle" | "active" | "disposed";

// Driver - 通信接口
interface Driver {
  readonly name: string;
  readonly sessionId: string;
  readonly state: DriverState;

  // 输入
  receive(message: UserMessage): AsyncIterable<StreamEvent>;
  interrupt(): void;

  // 生命周期
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

// CreateDriver - 工厂函数类型
type CreateDriver = (config: DriverConfig) => Driver;
```

### 实现包 (@agentxjs/claude-driver)

```typescript
// 只导出一个函数
export const createDriver: CreateDriver = (config) => {
  return new ClaudeDriverImpl(config);
};
```

### 使用示例

```typescript
import { createDriver } from "@agentxjs/claude-driver";

const driver = createDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  agentId: "agent-123",
  systemPrompt: "You are helpful",
  resumeSessionId: savedSessionId,
  onSessionIdCaptured: (id) => save(id),
});

await driver.initialize();

const turn = driver.receive(message);
for await (const event of turn) {
  handle(event);
}

await driver.dispose();
```

## 实现步骤

### Step 1: 定义接口 (@agentxjs/core)

- [ ] 定义 DriverConfig
- [ ] 定义 DriverState
- [ ] 定义 Driver 接口
- [ ] 定义 CreateDriver 类型
- [ ] 定义 StreamEvent（轻量版，参考旧设计）

### Step 2: BDD 测试

- [ ] 编写 driver.feature - Driver 基本行为
- [ ] 编写 driver-lifecycle.feature - 生命周期
- [ ] 编写 driver-resume.feature - 会话恢复

### Step 3: 实现 ClaudeDriver

- [ ] 重构 ClaudeDriver 实现新接口
- [ ] receive() 返回 AsyncIterable
- [ ] 移除 EventBus 依赖
- [ ] 测试通过

### Step 4: 更新上层

- [ ] 更新 Agent/Runtime 使用新 Driver
- [ ] 更新 BDD 测试

### Step 5: 清理

- [ ] 删除旧的 Driver 接口
- [ ] 更新文档

## 验收标准

1. Driver 接口简洁清晰
2. 输入输出边界明确（可录制）
3. BDD 测试覆盖核心场景
4. 现有功能不受影响

## 参考

- Kimi SDK: `/Users/sean/Deepractice/AgentX/temp/kimi-agent-sdk/node/agent_sdk/session.ts`
- 旧设计: `/Users/sean/Deepractice/AgentX/packages-old/types/src/agent/AgentDriver.ts`
