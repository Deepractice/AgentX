<div align="center">
  <h1>AgentX</h1>
  <p>
    <strong>下一代开源 AI 智能体开发框架与运行时平台</strong>
  </p>
  <p>Next-generation open-source AI agent development framework and runtime platform</p>

  <p>
    <b>事件驱动</b> · <b>多模型支持</b> · <b>RoleX 集成</b> · <b>TypeScript 优先</b>
  </p>

  <p>
    <a href="https://github.com/Deepractice/AgentX"><img src="https://img.shields.io/github/stars/Deepractice/AgentX?style=social" alt="Stars"/></a>
    <img src="https://visitor-badge.laobi.icu/badge?page_id=Deepractice.AgentX" alt="Views"/>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/AgentX?color=blue" alt="License"/></a>
    <a href="https://www.npmjs.com/package/agentxjs"><img src="https://img.shields.io/npm/v/agentxjs?color=cb3837&logo=npm" alt="npm"/></a>
  </p>

  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md"><strong>简体中文</strong></a>
  </p>
</div>

---

## 🚀 快速开始

### 本地模式（嵌入式）

几行 TypeScript 即可构建 AI Agent：

```typescript
import { createAgentX } from "agentxjs";
import { nodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";

const createDriver = (config) => createMonoDriver({
  ...config,
  apiKey: process.env.ANTHROPIC_API_KEY,
  provider: "anthropic",
});

const platform = await nodePlatform({ createDriver }).resolve();
const ax = createAgentX({ platform, createDriver });

// 创建对话并聊天
const agent = await ax.chat.create({
  name: "我的助手",
  embody: { systemPrompt: "你是一个有帮助的助手。" },
});

ax.on("text_delta", (e) => process.stdout.write(e.data.text));
await agent.send("你好！");
```

### 服务端模式

将 Agent 暴露为 WebSocket 服务：

```typescript
const ax = createAgentX({ platform, createDriver });
const server = await ax.serve({ port: 5200 });
```

### 远程模式（WebSocket 客户端）

连接到运行中的 AgentX 服务：

```typescript
import { createAgentX } from "agentxjs";

const ax = createAgentX();
const client = await ax.connect("ws://localhost:5200");

// 与本地模式相同的 API
const agent = await client.chat.create({ name: "我的助手" });
await agent.send("你好！");
```

### CLI 终端

交互式终端对话：

```bash
cd apps/cli
cp .env.example .env.local  # 设置 DEEPRACTICE_API_KEY
bun run dev
```

---

## 🧩 核心概念

AgentX 使用类似容器运行时的分层概念模型：

```
Prototype（原型）  →  Image（持久化）  →  Agent（运行时）
       ↓                   ↓                    ↓
   可复用定义           存储在数据库          运行在内存中
   注册一次            有会话记录           有生命周期
   类似 Dockerfile     类似 Docker 镜像     类似容器实例
```

- **Prototype** — 可复用的已注册智能体定义（名称、embody 等）
- **Embodiment** — 智能体"身体"的运行时配置：模型、系统提示、MCP 服务器
- **Image** — 从原型创建的持久化记录，包含会话和消息历史
- **Chat** — 由 Image 支撑的对话，通过 `AgentHandle` 访问

### API 架构

```typescript
ax.chat.*           // 对话管理（create, list, get → AgentHandle）
ax.prototype.*      // 原型注册中心（create, list, get, update, delete）
ax.provider.*       // LLM Provider 配置
ax.runtime.*        // 底层子系统（image, agent, session, container, prototype）
```

### Prototype — 可复用的 Agent 模板

注册一次原型，创建多个对话：

```typescript
// 注册原型
const proto = await ax.prototype.create({
  containerId: "default",
  name: "代码审查助手",
  embody: {
    model: "claude-sonnet-4-6",
    systemPrompt: "你是一个代码审查助手。",
  },
});

// 从原型创建对话
const agent = await ax.chat.create({ prototypeId: proto.record.prototypeId });
await agent.send("请审查这个 PR...");
```

---

## 🛠️ 包

| 包 | 说明 |
|---|------|
| **[agentxjs](./packages/agentx/README.md)** | 客户端 SDK — 本地、远程、服务端三种模式 |
| **[@agentxjs/core](./packages/core/README.md)** | 核心抽象 — Container、Image、Session、Driver |
| **[@agentxjs/node-platform](./packages/node-platform/README.md)** | Node.js 平台 — SQLite 持久化、WebSocket |
| **[@agentxjs/mono-driver](./packages/mono-driver/README.md)** | 多模型统一驱动（Anthropic、OpenAI、Google 等） |
| **[@agentxjs/claude-driver](./packages/claude-driver/README.md)** | Claude 专属驱动，支持扩展特性 |
| **[@agentxjs/devtools](./packages/devtools/README.md)** | BDD 测试工具 — MockDriver、RecordingDriver、Fixtures |

### 多模型支持

MonoDriver 通过 [Vercel AI SDK](https://sdk.vercel.ai/) 支持多个 LLM 提供商：

- **Anthropic** (Claude) — `provider: "anthropic"`
- **OpenAI** (GPT) — `provider: "openai"`
- **Google** (Gemini) — `provider: "google"`
- **DeepSeek** — `provider: "deepseek"`
- **Mistral** — `provider: "mistral"`
- **xAI** (Grok) — `provider: "xai"`
- **OpenAI 兼容** — `provider: "openai-compatible"`

### RoleX 集成

MonoDriver 集成了 [RoleX](https://github.com/AeonLabs/rolexjs) AI 角色管理系统 — 身份、目标、知识与认知成长循环：

```typescript
import { localPlatform } from "@rolexjs/local-platform";

const driver = createMonoDriver({
  ...config,
  rolex: {
    platform: localPlatform(),
    roleId: "my-role",
  },
});
```

---

## 🏗️ 架构

事件驱动架构与分层设计：

```
服务端                           SYSTEMBUS                    客户端
═══════════════════════════════════════════════════════════════════════════

                                     ║
┌─────────────────┐                  ║
│  环境层         │                  ║
│  • LLMProvider  │      emit        ║
│  • Sandbox      │─────────────────>║
└─────────────────┘                  ║
                                     ║
                                     ║
┌─────────────────┐    subscribe     ║
│  Agent 层       │<─────────────────║
│  • AgentEngine  │                  ║
│  • Agent        │      emit        ║
│                 │─────────────────>║         ┌─────────────────┐
│  4 层事件       │                  ║         │                 │
│  • Stream       │                  ║ broadcast │  WebSocket   │
│  • State        │                  ║════════>│ (事件流)        │
│  • Message      │                  ║<════════│                 │
│  • Turn         │                  ║  input  │  AgentX API     │
└─────────────────┘                  ║         └─────────────────┘
                                     ║
                                     ║
┌─────────────────┐                  ║
│  运行时层       │                  ║
│                 │      emit        ║
│  • Persistence  │─────────────────>║
│  • Container    │                  ║
│  • WebSocket    │<─────────────────╫
│                 │─────────────────>║
└─────────────────┘                  ║
                                     ║
                              [ 事件总线 ]
                            [ RxJS Pub/Sub ]

事件流:
  → 输入:  客户端 → WebSocket → BUS → LLM Driver
  ← 输出: Driver → BUS → AgentEngine → BUS → 客户端
```

---

## 💬 关于

AgentX 正在积极开发中。欢迎提出想法、反馈和贡献！

### 🌐 生态系统

[Deepractice](https://github.com/Deepractice) AI 基础设施的一部分：

- **[RoleX](https://github.com/AeonLabs/rolexjs)** — AI 角色管理系统（身份、认知、成长）
- **[ResourceX](https://github.com/Deepractice/ResourceX)** — 统一资源管理器
- **[IssueX](https://github.com/AeonLabs/issuexjs)** — AI 协作的结构化问题追踪

### 📞 联系方式

<div align="center">
  <p><strong>联系创始人</strong></p>
  <p>📧 <a href="mailto:sean@deepractice.ai">sean@deepractice.ai</a></p>
  <img src="https://brands.deepractice.ai/images/sean-wechat-qrcode.jpg" alt="微信二维码" width="200"/>
  <p><em>扫码添加 Sean（创始人兼 CEO）微信</em></p>
</div>

---

<div align="center">
  <p>
    用 ❤️ 构建 by <a href="https://github.com/Deepractice">Deepractice</a>
  </p>
</div>
