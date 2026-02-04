# Issue #002: Cloudflare Containers 部署方案

## 概述

基于 Cloudflare Containers 部署 AgentX 云服务，支持完整的 Claude SDK 运行环境。

## 背景

### 为什么选择 Cloudflare Containers

| 方案 | Claude SDK 支持 | 文件系统 | 扩缩容 | 全球部署 |
|------|----------------|----------|--------|----------|
| Workers | ❌ 不支持 | ❌ 无 | ✅ 自动 | ✅ |
| Containers | ✅ 支持 | ✅ 有 | ✅ Scale to Zero | ✅ |

Claude SDK (`@anthropic-ai/claude-code-sdk`) 依赖：
- Node.js 运行时
- 文件系统（workspace、临时文件）
- 子进程（MCP servers）

Workers 无法满足这些需求，Containers 可以。

### 定价估算

基础：$5/月 (Workers Paid Plan)

| 使用场景 | 预估成本 |
|----------|---------|
| 轻度使用 (10 req/天) | ~$5-10/月 |
| 中度使用 (100 req/天) | ~$10-30/月 |
| 重度使用 (1000 req/天) | ~$30-100/月 |

*Scale to Zero：容器睡眠时不计费*

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │   Browser    │────▶│   Workers    │────▶│  Containers  │   │
│   │  (agentxjs)  │     │  (Router)    │     │  (Runtime)   │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                     │                     │           │
│         │              ┌──────┴──────┐              │           │
│         │              │             │              │           │
│         ▼              ▼             ▼              ▼           │
│   ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│   │   D1     │   │   KV     │  │    R2    │  │  Claude  │     │
│   │ (SQLite) │   │ (Cache)  │  │ (Files)  │  │   API    │     │
│   └──────────┘   └──────────┘  └──────────┘  └──────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 组件职责

| 组件 | 职责 | 技术选型 |
|------|------|----------|
| **Browser** | UI + Presentation | `agentxjs` (RemoteClient) |
| **Workers** | 路由 + 认证 + 静态资源 | Cloudflare Workers |
| **Containers** | AgentX Runtime + Claude SDK | Docker + Node.js |
| **D1** | 持久化 (Container/Image/Session) | SQLite |
| **KV** | 缓存 + Session | Key-Value |
| **R2** | Workspace 文件存储 | Object Storage |

### 数据流

```
1. 用户发送消息
   Browser ──HTTP POST──▶ Workers

2. Workers 路由到 Container
   Workers ──Durable Object──▶ Container

3. Container 处理消息
   Container ──Claude SDK──▶ Claude API
                   │
                   ├──▶ D1 (持久化)
                   └──▶ R2 (Workspace)

4. 流式响应返回
   Claude API ──SSE──▶ Container ──SSE──▶ Workers ──SSE──▶ Browser
```

---

## 项目结构

### 新增 Package

```
packages/
├── cloudflare-provider/     # NEW: Cloudflare 平台实现
│   ├── src/
│   │   ├── index.ts
│   │   ├── persistence/
│   │   │   ├── D1ContainerRepository.ts
│   │   │   ├── D1ImageRepository.ts
│   │   │   └── D1SessionRepository.ts
│   │   ├── workspace/
│   │   │   └── R2WorkspaceProvider.ts
│   │   └── driver/
│   │       └── index.ts    # Re-export claude-driver
│   └── package.json
│
apps/
├── cloudflare/              # NEW: Cloudflare 部署应用
│   ├── worker/              # Workers 代码
│   │   └── src/
│   │       └── index.ts     # 路由 + 认证
│   ├── container/           # Container 代码
│   │   ├── Dockerfile
│   │   └── src/
│   │       └── server.ts    # AgentX Runtime
│   ├── wrangler.toml
│   └── package.json
```

### Package 依赖关系

```
apps/cloudflare
├── @agentxjs/cloudflare-provider
│   ├── @agentxjs/core
│   └── @agentxjs/claude-driver
├── @agentxjs/server
└── agentxjs (client, for type sharing)
```

---

## 实现计划

### Phase 1: 基础设施 (Week 1)

**目标**: 最小可运行版本

#### 1.1 创建 cloudflare-provider

```typescript
// packages/cloudflare-provider/src/index.ts
import type { AgentXProvider } from "@agentxjs/core/runtime";

export interface CloudflareProviderOptions {
  d1: D1Database;
  r2?: R2Bucket;
  createDriver: CreateDriver;
}

export async function createCloudflareProvider(
  options: CloudflareProviderOptions
): Promise<AgentXProvider> {
  return {
    containerRepository: new D1ContainerRepository(options.d1),
    imageRepository: new D1ImageRepository(options.d1),
    sessionRepository: new D1SessionRepository(options.d1),
    workspaceProvider: options.r2
      ? new R2WorkspaceProvider(options.r2)
      : new VirtualWorkspaceProvider(),
    createDriver: options.createDriver,
    eventBus: new EventBusImpl(),
  };
}
```

#### 1.2 D1 Schema

```sql
-- migrations/0001_init.sql

CREATE TABLE containers (
  container_id TEXT PRIMARY KEY,
  config TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE images (
  image_id TEXT PRIMARY KEY,
  container_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  mcp_servers TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (container_id) REFERENCES containers(container_id)
);

CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  container_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images(image_id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE INDEX idx_images_container ON images(container_id);
CREATE INDEX idx_sessions_container ON sessions(container_id);
CREATE INDEX idx_messages_session ON messages(session_id);
```

#### 1.3 Dockerfile

```dockerfile
# apps/cloudflare/container/Dockerfile
FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/server.js"]
```

#### 1.4 wrangler.toml

```toml
name = "agentx-cloud"
compatibility_date = "2025-01-01"

# Workers entry
main = "worker/src/index.ts"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "agentx"
database_id = "<your-d1-id>"

# R2 Bucket (optional)
[[r2_buckets]]
binding = "WORKSPACE"
bucket_name = "agentx-workspace"

# Container configuration
[[containers]]
class_name = "AgentXContainer"
image = "./container/Dockerfile"
max_instances = 10

[[durable_objects.bindings]]
name = "CONTAINER"
class_name = "AgentXContainer"

# Environment variables
[vars]
ANTHROPIC_BASE_URL = "https://api.anthropic.com"

# Secrets (set via wrangler secret put)
# ANTHROPIC_API_KEY
```

### Phase 2: 核心功能 (Week 2)

**目标**: 完整的消息收发

#### 2.1 Worker 路由

```typescript
// apps/cloudflare/worker/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Container API - route to container
app.all("/api/*", async (c) => {
  const id = c.req.header("X-Container-Id") || "default";
  const container = c.env.CONTAINER.get(c.env.CONTAINER.idFromName(id));
  return container.fetch(c.req.raw);
});

// Static assets (if needed)
app.get("/*", async (c) => {
  // Serve from R2 or return 404
});

export default app;

// Container Durable Object
export class AgentXContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "60s"; // Sleep after 60s of inactivity

  envVars = {
    NODE_ENV: "production",
  };
}
```

#### 2.2 Container Server

```typescript
// apps/cloudflare/container/src/server.ts
import { createServer } from "@agentxjs/server";
import { createCloudflareProvider } from "@agentxjs/cloudflare-provider";
import { createClaudeDriver } from "@agentxjs/claude-driver";

const server = await createServer({
  provider: await createCloudflareProvider({
    d1: env.DB,
    r2: env.WORKSPACE,
    createDriver: createClaudeDriver,
  }),
  port: 8080,
});

await server.listen();
console.log("AgentX Container started on port 8080");
```

### Phase 3: 认证与多租户 (Week 3)

**目标**: 生产可用

#### 3.1 认证中间件

```typescript
// Worker 认证
app.use("/api/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Verify token (JWT / API Key)
  const user = await verifyToken(token, c.env);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("user", user);
  await next();
});
```

#### 3.2 多租户隔离

```typescript
// 每个用户一个 Container ID
app.all("/api/*", async (c) => {
  const user = c.get("user");
  const containerId = `user-${user.id}`;

  // Route to user's container
  const container = c.env.CONTAINER.get(
    c.env.CONTAINER.idFromName(containerId)
  );

  // Forward with user context
  const request = new Request(c.req.raw, {
    headers: {
      ...Object.fromEntries(c.req.raw.headers),
      "X-User-Id": user.id,
      "X-Container-Id": containerId,
    },
  });

  return container.fetch(request);
});
```

### Phase 4: 优化与监控 (Week 4)

- [ ] 添加 Cloudflare Analytics
- [ ] 添加错误追踪 (Sentry)
- [ ] 添加请求日志
- [ ] 性能优化（冷启动、缓存）
- [ ] 添加限流

---

## API 设计

### REST API

```
POST   /api/containers                    # 创建 Container
GET    /api/containers/:id                # 获取 Container
DELETE /api/containers/:id                # 删除 Container

POST   /api/containers/:id/images         # 创建 Image
GET    /api/containers/:id/images         # 列出 Images
GET    /api/images/:id                    # 获取 Image
DELETE /api/images/:id                    # 删除 Image

POST   /api/images/:id/agents             # 创建 Agent
GET    /api/agents/:id                    # 获取 Agent
DELETE /api/agents/:id                    # 销毁 Agent

POST   /api/agents/:id/messages           # 发送消息 (SSE response)
POST   /api/agents/:id/interrupt          # 中断
```

### WebSocket API (Future)

```
WS /api/ws?token=xxx

→ { "type": "subscribe", "agentId": "xxx" }
← { "type": "subscribed", "agentId": "xxx" }
← { "type": "text_delta", "data": { "text": "Hello" } }
← { "type": "message_stop", "data": {} }
```

---

## 开发包版本

### 发布 Dev 版本

所有 packages 发布 `-dev` 后缀版本供云平台团队使用：

```
@agentxjs/core@1.9.1-dev
@agentxjs/claude-driver@1.9.1-dev
@agentxjs/server@1.9.1-dev
@agentxjs/node-provider@1.9.1-dev
@agentxjs/devtools@1.9.1-dev
agentxjs@1.9.1-dev
```

### 使用方式

```bash
# 云平台团队安装
pnpm add @agentxjs/core@1.9.1-dev
pnpm add @agentxjs/server@1.9.1-dev
pnpm add @agentxjs/claude-driver@1.9.1-dev
pnpm add @agentxjs/node-provider@1.9.1-dev
pnpm add agentxjs@1.9.1-dev
```

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Container 冷启动慢 | 用户体验 | 预热策略、增加 sleepAfter |
| Claude SDK 兼容性 | 功能受限 | 测试验证、降级方案 |
| D1 性能 | 高并发场景 | KV 缓存、读写分离 |
| Beta 阶段不稳定 | 服务中断 | 监控告警、快速回滚 |

---

## 里程碑

| 阶段 | 目标 | 时间 |
|------|------|------|
| M1 | Dev 包发布 + 方案评审 | Week 0 |
| M2 | 基础设施 + 最小可运行 | Week 1 |
| M3 | 核心功能 + API 完整 | Week 2 |
| M4 | 认证 + 多租户 | Week 3 |
| M5 | 优化 + 生产就绪 | Week 4 |

---

## 参考资料

- [Cloudflare Containers 文档](https://developers.cloudflare.com/containers/)
- [Cloudflare Containers 定价](https://developers.cloudflare.com/containers/pricing/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
