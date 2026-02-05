# MonoDriver - 跨平台统一 Driver

## 背景

当前 AgentX 使用 `ClaudeDriver`（基于 `@anthropic-ai/claude-agent-sdk`）作为默认 Driver。该方案存在以下问题：

1. **重度依赖子进程**：Claude Agent SDK 需要启动 Node.js CLI 子进程，CPU 占用高
2. **不适合 Serverless**：在 Cloudflare Containers 等受限环境中无法运行（CPU 配额不足直接崩溃）
3. **单一 Provider**：仅支持 Claude，无法切换其他 LLM

## 目标

使用 [Vercel AI SDK](https://ai-sdk.dev) 实现 `MonoDriver` - 统一的跨平台 Driver：

1. **Mono = 统一**：一个接口对接多个 LLM Provider
2. **跨平台**：Node.js, Bun, Edge Runtime, Cloudflare Workers 全支持
3. **轻量级**：直接 HTTP API 调用，无子进程开销
4. **多 Provider**：支持 OpenAI, Anthropic, Google, Mistral 等
5. **可插拔**：作为默认 Driver，同时支持注入其他 Driver（如 ClaudeDriver）

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────┐
│                    Runtime                          │
│         (消息历史、Session、事件分发)                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │    Driver    │  ← 可插拔接口
              └──────┬───────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ MonoDriver │ │ClaudeDriver│ │  Future    │
│  (默认)    │ │ (Agent SDK)│ │  Drivers   │
│ 统一·跨平台 │ │  完整能力   │ │            │
└────────────┘ └────────────┘ └────────────┘
```

### Session 注入设计

**核心思路**：Driver 持有 Session，需要历史时直接从 Session 读取。

| Driver | Session 使用方式 |
|--------|-----------------|
| **MonoDriver** | 每次 `receive()` 从 Session 读取完整历史 |
| **ClaudeDriver** | 忽略 Session，SDK 内部管理历史 |

**好处**：
- Driver 只读不写，Session 负责存储
- 消息存储仍由 Runtime 负责
- 符合单一职责原则

## 接口变更

### 1. 扩展 DriverConfig

```typescript
// packages/core/src/driver/types.ts
export interface DriverConfig<TOptions = Record<string, unknown>> {
  // === 现有字段 ===
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  agentId: string;
  systemPrompt?: string;
  cwd?: string;
  mcpServers?: Record<string, McpServerConfig>;
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
  options?: TOptions;

  // === 新增字段 ===

  /**
   * Session for message history access
   *
   * Stateless drivers (like VercelDriver) use this to read history.
   * Stateful drivers (like ClaudeDriver) may ignore this.
   */
  session?: Session;
}
```

### 2. Runtime 注入 Session

```typescript
// AgentXRuntime.ts createAgent()
const session = await this.getOrCreateSession(imageRecord.sessionId);

const driverConfig: DriverConfig = {
  // ... 现有配置 ...
  session,  // 注入 Session
};

const driver = this.provider.createDriver(driverConfig);
```

### 3. MonoDriver 接口选项

```typescript
// packages/core/src/mono/types.ts
export interface MonoDriverOptions {
  /**
   * LLM Provider
   * @default 'anthropic'
   */
  provider?: 'anthropic' | 'openai' | 'google' | 'mistral';

  /**
   * Model override (provider-specific)
   */
  model?: string;

  /**
   * Max agentic steps for tool calling
   * @default 10
   */
  maxSteps?: number;
}

export type MonoDriverConfig = DriverConfig<MonoDriverOptions>;
```

## 包结构

```
packages/
├── core/                    # Driver 接口定义（不变）
│   └── src/driver/types.ts
├── mono-driver/             # 新增：MonoDriver 独立包
│   ├── src/
│   │   ├── MonoDriver.ts    # 主实现
│   │   ├── providers/       # Provider 适配
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── index.ts
│   │   ├── converters.ts    # Message/Event 转换
│   │   ├── types.ts         # MonoDriver 类型
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── claude-driver/           # 保留：完整 Claude Code 能力
└── runtime/                 # 默认使用 mono-driver
```

**独立包的好处**：
- BDD 测试可以针对 MonoDriver 单独运行
- `ai`, `@ai-sdk/*` 依赖不污染 core
- 用户可选择性安装
- 版本独立演进

## 事件映射

Vercel AI SDK 事件需要映射到 `DriverStreamEvent`：

| Vercel AI SDK | DriverStreamEvent | 说明 |
|---------------|-------------------|------|
| stream start | `message_start` | messageId, model |
| textStream | `text_delta` | 增量文本 |
| toolCall start | `tool_use_start` | toolCallId, toolName |
| toolCall args | `input_json_delta` | 增量 JSON |
| toolCall end | `tool_use_stop` | 完整 input |
| toolResult | `tool_result` | 执行结果 |
| stream end | `message_stop` | stopReason |
| error | `error` | 错误信息 |

## 依赖

```json
{
  "name": "@agentxjs/mono-driver",
  "version": "0.0.1",
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0"
  },
  "peerDependencies": {
    "@agentxjs/core": "workspace:*"
  }
}
```

## 实现步骤

### Phase 1: 接口准备

- [ ] 扩展 `DriverConfig` 添加 `session` 字段
- [ ] Runtime 创建 Driver 时注入 Session
- [ ] 确保 ClaudeDriver 正常工作（忽略 session）

### Phase 2: 创建 mono-driver 包

- [ ] 初始化 `packages/mono-driver/` 包结构
- [ ] 配置 `package.json`（依赖 `ai`, `@ai-sdk/anthropic`）
- [ ] 实现 `MonoDriver` 类
- [ ] 实现 Message 转换（AgentX Message → Vercel CoreMessage）
- [ ] 实现 Event 转换（Vercel fullStream → DriverStreamEvent）
- [ ] 支持 Anthropic provider
- [ ] 导出 `createMonoDriver` 工厂函数

### Phase 3: 集成测试

- [ ] BDD 测试：基本对话流程
- [ ] BDD 测试：Tool calling
- [ ] BDD 测试：会话恢复（从 Session 读取历史）
- [ ] 对比测试：MonoDriver vs ClaudeDriver 输出一致性

### Phase 4: 多 Provider 支持

- [ ] 添加 OpenAI provider
- [ ] 添加 Google provider
- [ ] Provider 配置文档

### Phase 5: 默认切换

- [ ] Runtime 默认使用 MonoDriver
- [ ] 环境变量 `AGENTX_DRIVER=mono|claude-code`
- [ ] 更新文档

### Phase 6: MCP 支持（可选）

- [ ] 集成 AI SDK MCP client
- [ ] 支持 stdio transport
- [ ] MCP 工具发现和调用

## 环境兼容性

| 环境 | MonoDriver | ClaudeDriver |
|------|------------|--------------|
| Node.js | ✅ | ✅ |
| Bun | ✅ | ✅ |
| Cloudflare Workers | ✅ | ❌ |
| Cloudflare Containers | ✅ | ❌ (CPU 限制) |
| Vercel Edge | ✅ | ❌ |
| AWS Lambda | ✅ | ⚠️ 需要大内存 |

## 配置示例

```typescript
// 使用 MonoDriver (默认)
const agentx = createAgentX({
  driver: 'mono',
  driverConfig: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
});

// 使用 Claude Code Driver (本地开发/完整能力)
const agentx = createAgentX({
  driver: 'claude-code',
  driverConfig: {
    claudeCodePath: '/path/to/cli.js',
  },
});

// 动态选择
const agentx = createAgentX({
  driver: process.env.AGENTX_DRIVER || 'mono',
});
```

## 验收标准

1. MonoDriver 实现完整的 Driver 接口
2. 所有 DriverStreamEvent 类型正确映射
3. Session 历史正确读取和转换
4. BDD 测试覆盖核心场景
5. 在 Cloudflare Workers 环境可运行
6. 现有 ClaudeDriver 功能不受影响

## 参考资料

- [Vercel AI SDK 文档](https://ai-sdk.dev/docs)
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [AI SDK MCP Tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- 现有 Driver 接口: `packages/core/src/driver/types.ts`
- 现有 ClaudeDriver: `packages/claude-driver/src/ClaudeDriver.ts`
