# Runtime + AgentX 同构架构设计

## 概述

AgentX 采用了一种**反直觉但优雅**的同构架构设计，实现了 "Define Once, Run Anywhere"（一次定义，到处运行）的目标。

**核心洞察**：将系统分为两层 - **业务逻辑层（AgentX）** 和 **基础设施层（Runtime）**，通过 Repository 接口实现同构。

## 为什么说反直觉？

传统思维：

- Server 端和 Browser 端是两套代码
- Server 直接写数据库，Browser 调 HTTP API
- 两边的数据结构和 API 可能不一致

AgentX 思维：

- Server 和 Browser **使用完全相同的业务代码**
- 差异仅在 Runtime 层的 Repository 实现
- 一套类型定义，两端共享

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                         │
│                    (完全相同)                                │
│                                                             │
│   const agentx = createAgentX(runtime);                     │
│   agentx.definitions.register(MyDef);                       │
│   const metaImage = await agentx.images.getMetaImage(name); │
│   const session = await agentx.sessions.create(imageId);    │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   Server Runtime    │       │   Browser Runtime   │
│   (agentx-node)     │       │   (SSERuntime)      │
│                     │       │                     │
│   SQLiteRepository  │       │   RemoteRepository  │
│   (直接写数据库)     │       │   (HTTP → Server)   │
└─────────────────────┘       └─────────────────────┘
```

## 架构分层

### 1. 类型定义层（agentx-types）

**纯类型定义，零运行时依赖**

```
agentx-types/
├── agentx/           # 平台 API 类型 (AgentX, defineAgent)
│   ├── definition/   # DefinitionManager 接口
│   ├── image/        # ImageManager 接口
│   ├── session/      # SessionManager 接口
│   └── agent/        # AgentManager 接口
├── runtime/          # 运行时类型
│   ├── repository/   # Repository 接口 + Record 类型
│   ├── container/    # Container 接口
│   └── sandbox/      # Sandbox 接口
├── definition/       # AgentDefinition 类型
├── image/            # AgentImage 类型 (MetaImage | DerivedImage)
└── session/          # Session 类型
```

**关键点**：

- `agentx/` 定义业务接口（DefinitionManager, ImageManager 等）
- `runtime/` 定义基础设施接口（Repository, Container, Sandbox）
- 两者通过 `Repository` 连接

### 2. 业务逻辑层（agentx）

**平台无关的业务实现**

```typescript
// agentx/src/AgentX.ts
export function createAgentX(runtime: Runtime): AgentX {
  // 从 Runtime 获取 Repository
  const repository = runtime.repository;

  // 创建管理器（使用 Repository）
  const definitionManager = new DefinitionManagerImpl(repository);
  const imageManager = new ImageManagerImpl(repository);
  const sessionManager = new SessionManagerImpl(repository);

  return {
    definitions: definitionManager,
    images: imageManager,
    sessions: sessionManager,
    // ...
  };
}
```

**关键点**：

- `createAgentX(runtime)` 接收 Runtime，不关心具体实现
- 所有 Manager 使用 Repository 接口，不直接依赖数据库
- 业务逻辑完全相同，无论 Server 还是 Browser

### 3. 基础设施层（Runtime 实现）

#### Server Runtime (agentx-node)

```typescript
// agentx-node/src/NodeRuntime.ts
class NodeRuntime implements Runtime {
  repository = new SQLiteRepository("./data/agent.db");

  createDriver(definition, context, sandbox) {
    return new ClaudeDriver(definition, context, sandbox);
  }

  createSandbox(name) {
    return new LocalSandbox(name);
  }
}
```

**SQLiteRepository**：

- Definition 方法：内存实现（代码定义，不持久化）
- Image 方法：SQLite 表
- Session 方法：SQLite 表

#### Browser Runtime (SSERuntime)

```typescript
// agentx/src/client/SSERuntime.ts
class SSERuntime implements Runtime {
  repository = new RemoteRepository({ serverUrl: "http://..." });

  createDriver(definition, context, sandbox) {
    return new SSEDriver({ serverUrl, agentId: context.agentId });
  }

  createSandbox(name) {
    return noopSandbox; // Browser 不需要本地资源
  }
}
```

**RemoteRepository**：

- 所有方法通过 HTTP 调用 Server
- Server 再用 SQLiteRepository 处理

## Repository 接口设计

```typescript
interface Repository {
  // Definition（源码层，代码定义）
  saveDefinition(record: DefinitionRecord): Promise<void>;
  findDefinitionByName(name: string): Promise<DefinitionRecord | null>;
  findAllDefinitions(): Promise<DefinitionRecord[]>;
  deleteDefinition(name: string): Promise<void>;
  definitionExists(name: string): Promise<boolean>;

  // Image（构建产物，持久化）
  saveImage(record: ImageRecord): Promise<void>;
  findImageById(imageId: string): Promise<ImageRecord | null>;
  findAllImages(): Promise<ImageRecord[]>;
  deleteImage(imageId: string): Promise<void>;
  imageExists(imageId: string): Promise<boolean>;

  // Session（用户会话，持久化）
  saveSession(record: SessionRecord): Promise<void>;
  findSessionById(sessionId: string): Promise<SessionRecord | null>;
  // ... 更多方法
}
```

**实现映射**：

| 方法           | SQLiteRepository     | RemoteRepository       |
| -------------- | -------------------- | ---------------------- |
| saveDefinition | Map.set()            | PUT /definitions/:name |
| saveImage      | INSERT INTO images   | PUT /images/:id        |
| saveSession    | INSERT INTO sessions | PUT /sessions/:id      |

## Docker-style 分层架构

```
AgentFile/Code (源码)
    │
    ├──[register]──→ Definition (内存)
    │                    │
    │                    └──[auto]──→ MetaImage (持久化)
    │                                     │
    │                                     ├──→ Session A
    │                                     │        │
    │                                     │        └──[commit]──→ DerivedImage A'
    │                                     │
    │                                     └──→ Session B
    │
    └── 类比: Dockerfile → docker build → Image → docker run → Container
```

**Definition vs Image**：

- **Definition**：类似 Dockerfile，是源码/配置文件
- **MetaImage**：Definition 的自动产物，是创世镜像
- **DerivedImage**：Session.commit() 的产物，包含对话历史

## 同构的价值

### 1. 代码复用

```typescript
// 同一份代码，Server 和 Browser 都能用
const agentx = createAgentX(runtime);
agentx.definitions.register(TranslatorDef);

const metaImage = await agentx.images.getMetaImage("Translator");
const session = await agentx.sessions.create(metaImage.imageId, userId);
```

### 2. 类型安全

```typescript
// 类型定义共享，编译时检查
const image: AgentImage = await agentx.images.get(imageId);
if (image.type === "meta") {
  // TypeScript 知道这是 MetaImage
  console.log(image.definitionName);
}
```

### 3. 测试简化

```typescript
// 可以用内存 Repository 测试业务逻辑
const mockRepository = new InMemoryRepository();
const agentx = createAgentX({ repository: mockRepository });
// 测试业务逻辑，不需要真实数据库
```

### 4. 扩展性

```typescript
// 未来可以轻松添加新的 Repository 实现
class RedisRepository implements Repository { ... }
class PostgresRepository implements Repository { ... }
class FirebaseRepository implements Repository { ... }
```

## 数据流示意

### Server 端

```
用户代码                    agentx                   agentx-node
────────                   ──────                   ───────────

agentx.definitions         DefinitionManagerImpl    SQLiteRepository
  .register(def)  ──────>    .register()  ──────>    .saveDefinition()
                             .cache.set()             [内存 Map]
                             .saveImage()  ──────>   .saveImage()
                                                      [SQLite INSERT]
```

### Browser 端

```
用户代码                    agentx                   agentx/client
────────                   ──────                   ────────────

agentx.definitions         DefinitionManagerImpl    RemoteRepository
  .register(def)  ──────>    .register()  ──────>    .saveDefinition()
                             .cache.set()             [HTTP PUT]
                             .saveImage()  ──────>       │
                                                         ▼
                                                    Server Handler
                                                         │
                                                         ▼
                                                    SQLiteRepository
                                                      [SQLite INSERT]
```

## 关键文件

```
packages/
├── agentx-types/src/
│   ├── index.ts              # 主入口，导出所有类型
│   ├── agentx/index.ts       # 平台 API 类型
│   ├── runtime/index.ts      # 运行时类型
│   └── runtime/repository/   # Repository 接口
│
├── agentx/src/
│   ├── AgentX.ts             # createAgentX 实现
│   ├── managers/             # Manager 实现（使用 Repository）
│   └── repository/
│       └── RemoteRepository.ts  # HTTP 实现
│
├── agentx-node/src/
│   ├── NodeRuntime.ts        # Server Runtime
│   └── repository/
│       └── SQLiteRepository.ts  # SQLite 实现
│
└── agentx/src/client/
    └── SSERuntime.ts         # Browser Runtime
```

## 总结

这种架构的核心智慧：

1. **分离关注点**：业务逻辑（AgentX）和基础设施（Runtime）完全分离
2. **依赖倒置**：业务代码依赖抽象（Repository 接口），不依赖具体实现
3. **同构设计**：一套代码，多端运行，通过 Runtime 切换底层实现
4. **Docker 思想**：Definition → Image → Session 的分层，类似 Dockerfile → Image → Container

**反直觉之处**：

- 浏览器端的 `agentx.definitions.register()` 最终也会通过 HTTP 调用服务器
- 看起来是客户端代码，实际上是同构的业务逻辑
- Repository 接口统一了本地存储和远程 API

**优雅之处**：

- 应用开发者完全不需要关心是 Server 还是 Browser
- 换 Runtime 就能换运行环境，业务代码零修改
- 类型系统保证了 Server/Browser 的 API 一致性
