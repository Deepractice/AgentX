<div align="center">
  <h1>AgentX</h1>
  <p>
    <strong>Next-generation open-source AI agent development framework and runtime platform</strong>
  </p>
  <p>下一代开源 AI 智能体开发框架与运行时平台</p>

  <p>
    <b>Event-driven Runtime</b> · <b>Multi-provider LLM</b> · <b>RoleX Integration</b> · <b>TypeScript First</b>
  </p>

  <p>
    <a href="https://github.com/Deepractice/AgentX"><img src="https://img.shields.io/github/stars/Deepractice/AgentX?style=social" alt="Stars"/></a>
    <img src="https://visitor-badge.laobi.icu/badge?page_id=Deepractice.AgentX" alt="Views"/>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/AgentX?color=blue" alt="License"/></a>
    <a href="https://www.npmjs.com/package/agentxjs"><img src="https://img.shields.io/npm/v/agentxjs?color=cb3837&logo=npm" alt="npm"/></a>
  </p>

  <p>
    <a href="README.md"><strong>English</strong></a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>
</div>

---

## 🚀 Quick Start

### Local Mode (Embedded)

Build an AI agent in a few lines of TypeScript:

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

// Create a conversation and chat
const agent = await ax.chat.create({
  name: "My Assistant",
  embody: { systemPrompt: "You are a helpful assistant." },
});

ax.on("text_delta", (e) => process.stdout.write(e.data.text));
await agent.send("Hello!");
```

### Server Mode

Expose your agent as a WebSocket server:

```typescript
const ax = createAgentX({ platform, createDriver });
const server = await ax.serve({ port: 5200 });
```

### Remote Mode (WebSocket Client)

Connect to a running AgentX server:

```typescript
import { createAgentX } from "agentxjs";

const ax = createAgentX();
const client = await ax.connect("ws://localhost:5200");

// Same API as local mode
const agent = await client.chat.create({ name: "My Assistant" });
await agent.send("Hello!");
```

### CLI

Interactive terminal chat:

```bash
cd apps/cli
cp .env.example .env.local  # Set DEEPRACTICE_API_KEY
bun run dev
```

---

## 🧩 Core Concepts

AgentX uses a layered concept model inspired by container runtimes:

```
Prototype (template)  →  Image (persistent)  →  Agent (runtime)
       ↓                       ↓                      ↓
  Reusable definition     Stored in DB          Running in memory
  Registered once         Has session           Has lifecycle
  Like Dockerfile         Like Docker image     Like container
```

- **Prototype** — a reusable, registered agent definition (name, embody, etc.)
- **Embodiment** — runtime config for an agent's "body": model, system prompt, MCP servers
- **Image** — persistent record created from a prototype, with session and message history
- **Chat** — a conversation backed by an Image, accessed via `AgentHandle`

### API Architecture

```typescript
ax.chat.*           // Conversation management (create, list, get → AgentHandle)
ax.prototype.*      // Prototype registry (register, list, get — coming soon)
ax.provider.*       // LLM provider configuration
ax.runtime.*        // Low-level subsystems (image, agent, session, container)
```

---

## 🛠️ Packages

| Package | Description |
|---------|-------------|
| **[agentxjs](./packages/agentx/README.md)** | Client SDK — local, remote, and server modes |
| **[@agentxjs/core](./packages/core/README.md)** | Core abstractions — Container, Image, Session, Driver |
| **[@agentxjs/node-platform](./packages/node-platform/README.md)** | Node.js platform — SQLite persistence, WebSocket |
| **[@agentxjs/mono-driver](./packages/mono-driver/README.md)** | Multi-provider LLM driver (Anthropic, OpenAI, Google, etc.) |
| **[@agentxjs/claude-driver](./packages/claude-driver/README.md)** | Claude-specific driver with extended features |
| **[@agentxjs/devtools](./packages/devtools/README.md)** | BDD testing tools — MockDriver, RecordingDriver, Fixtures |

### Multi-Provider Support

MonoDriver supports multiple LLM providers via [Vercel AI SDK](https://sdk.vercel.ai/):

- **Anthropic** (Claude) — `provider: "anthropic"`
- **OpenAI** (GPT) — `provider: "openai"`
- **Google** (Gemini) — `provider: "google"`
- **DeepSeek** — `provider: "deepseek"`
- **Mistral** — `provider: "mistral"`
- **xAI** (Grok) — `provider: "xai"`
- **OpenAI-compatible** — `provider: "openai-compatible"`

### RoleX Integration

MonoDriver integrates with [RoleX](https://github.com/AeonLabs/rolexjs) for AI role management — identity, goals, knowledge, and cognitive growth cycles:

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

## 🏗️ Architecture

Event-driven architecture with layered design:

```
SERVER SIDE                      SYSTEMBUS                   CLIENT SIDE
═══════════════════════════════════════════════════════════════════════════

                                     ║
┌─────────────────┐                  ║
│  Environment    │                  ║
│  • LLMProvider  │      emit        ║
│  • Sandbox      │─────────────────>║
└─────────────────┘                  ║
                                     ║
                                     ║
┌─────────────────┐    subscribe     ║
│  Agent Layer    │<─────────────────║
│  • AgentEngine  │                  ║
│  • Agent        │      emit        ║
│                 │─────────────────>║         ┌─────────────────┐
│  4-Layer Events │                  ║         │                 │
│  • Stream       │                  ║ broadcast │  WebSocket   │
│  • State        │                  ║════════>│ (Event Stream)  │
│  • Message      │                  ║<════════│                 │
│  • Turn         │                  ║  input  │  AgentX API     │
└─────────────────┘                  ║         └─────────────────┘
                                     ║
                                     ║
┌─────────────────┐                  ║
│  Runtime Layer  │                  ║
│                 │      emit        ║
│  • Persistence  │─────────────────>║
│  • Container    │                  ║
│  • WebSocket    │<─────────────────╫
│                 │─────────────────>║
└─────────────────┘                  ║
                                     ║
                              [ Event Bus ]
                             [ RxJS Pub/Sub ]

Event Flow:
  → Input:  Client → WebSocket → BUS → LLM Driver
  ← Output: Driver → BUS → AgentEngine → BUS → Client
```

---

## 💬 About

AgentX is in active development. We welcome your ideas, feedback, and contributions!

### 🌐 Ecosystem

Part of the [Deepractice](https://github.com/Deepractice) AI infrastructure:

- **[RoleX](https://github.com/AeonLabs/rolexjs)** — AI role management system (identity, cognition, growth)
- **[ResourceX](https://github.com/Deepractice/ResourceX)** — Unified resource manager
- **[IssueX](https://github.com/AeonLabs/issuexjs)** — Structured issue tracking for AI collaboration

### 📞 Connect

<div align="center">
  <p><strong>Connect with the Founder</strong></p>
  <p>📧 <a href="mailto:sean@deepractice.ai">sean@deepractice.ai</a></p>
  <img src="https://brands.deepractice.ai/images/sean-wechat-qrcode.jpg" alt="WeChat QR Code" width="200"/>
  <p><em>Scan to connect with Sean (Founder & CEO) on WeChat</em></p>
</div>

---

<div align="center">
  <p>
    Built with ❤️ by <a href="https://github.com/Deepractice">Deepractice</a>
  </p>
</div>
