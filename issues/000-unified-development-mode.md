# Deepractice 统一开发规范

## 概述

这是 Deepractice Cloud 项目的统一开发规范，结合了 **Code Review 协作** 和 **BDD（行为驱动开发）**，并定义了内部共享包的使用方式。

**核心理念**：

- 测试不是"事后补"的，而是开发过程中自然产出的
- Feature 文件 = 需求文档 + 验收标准 + 自动化测试
- 问题充分讨论后再动手，避免返工
- 使用统一的内部包，保持代码一致性

---

## 标准服务技术栈

所有 Deepractice 服务遵循统一的技术栈，确保一致性和可维护性。

### 技术选型

| 层级               | 选择                       | 说明                     |
| ------------------ | -------------------------- | ------------------------ |
| **Runtime (prod)** | Cloudflare Workers         | 边缘计算，低延迟         |
| **Runtime (dev)**  | Bun                        | 快速开发体验             |
| **Framework**      | Next.js + OpenNext         | 前后端一体，SSR 支持     |
| **API**            | Hono                       | 轻量、类型安全、边缘友好 |
| **Database**       | Cloudflare D1              | SQLite 兼容，边缘数据库  |
| **ORM**            | Drizzle                    | 类型安全，轻量           |
| **Architecture**   | DDD                        | 领域驱动设计             |
| **Testing**        | @deepractice/bdd           | BDD 行为测试             |
| **DDD Blocks**     | @deepractice/ddd           | 实体、值对象、错误       |
| **Design System**  | @deepractice/design-tokens | 统一设计令牌             |

### 标准目录结构

```
services/{service-name}/
├── src/                                       # 生产代码
│   ├── domain/                                # 领域层
│   │   ├── {Entity}.ts                        # 领域实体
│   │   ├── {Entity}Repository.ts              # 仓储接口
│   │   └── index.ts
│   ├── application/                           # 应用层
│   │   ├── {UseCase}Service.ts                # 用例服务（@injectable）
│   │   └── index.ts
│   ├── infrastructure/                        # 基础设施层
│   │   ├── database/
│   │   │   └── schema.ts                      # Drizzle schema（唯一源头）
│   │   ├── repositories/                      # 仓储实现
│   │   │   ├── Drizzle{Entity}Repository.ts   # 统一实现（@injectable）
│   │   │   └── index.ts
│   │   ├── container/
│   │   │   ├── tokens.ts                      # DI tokens
│   │   │   └── index.ts                       # registerProductionDependencies()
│   │   └── providers/                         # 外部服务（OAuth 等）
│   ├── interfaces/                            # 接口层
│   │   └── http/
│   │       ├── routes/                        # API 路由
│   │       └── middleware/                    # 中间件
│   └── app/                                   # Next.js 页面（如需要前端）
│       ├── page.tsx
│       └── api/
├── bdd/                                       # BDD 测试（自管理）
│   ├── features/                              # .feature 文件
│   ├── steps/                                 # Step 定义
│   └── support/                               # 测试配置
│       ├── database.ts                        # createTestDatabase() + clear
│       ├── container.ts                       # 测试 DI 配置
│       └── world.ts                           # 测试上下文
├── drizzle/                                   # 自动生成的 migrations
│   ├── 0000_xxx.sql
│   └── meta/
├── drizzle.config.ts                          # Drizzle Kit 配置
├── wrangler.jsonc                             # Cloudflare 配置
├── package.json
└── tsconfig.json
```

### 服务类型

| 类型       | 命名规则          | 示例            |
| ---------- | ----------------- | --------------- |
| **纯 API** | `{name}-api`      | `registry-api`  |
| **纯前端** | `{name}-web`      | `dashboard-web` |
| **全栈**   | `{name}` (无后缀) | `account`       |

### 环境配置

| 环境     | 域名                | 命名格式                    |
| -------- | ------------------- | --------------------------- |
| **开发** | `*.deepractice.dev` | `{service}-deepractice-dev` |
| **生产** | `*.deepractice.ai`  | `{service}-deepractice-ai`  |

**wrangler.jsonc 示例**：

```jsonc
{
  "name": "account-deepractice-dev",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "routes": [{ "pattern": "account.deepractice.dev/*", "zone_name": "deepractice.dev" }],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "account-deepractice-dev",
      "database_id": "xxx",
      "migrations_dir": "drizzle",
    },
  ],
  "env": {
    "ai": {
      "name": "account-deepractice-ai",
      "routes": [{ "pattern": "account.deepractice.ai/*", "zone_name": "deepractice.ai" }],
    },
  },
}
```

### package.json 标准脚本

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test:bdd": "deepractice-bdd",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "wrangler d1 migrations apply {db-name} --local"
  }
}
```

### 标准依赖

```json
{
  "dependencies": {
    "@deepractice/compat": "workspace:*",
    "@deepractice/ddd": "workspace:*",
    "@deepractice/di": "workspace:*",
    "@deepractice/design-tokens": "workspace:*",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.0.0",
    "jose": "^5.0.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@deepractice/bdd": "workspace:*",
    "@cloudflare/workers-types": "^4.x",
    "@opennextjs/cloudflare": "^1.x",
    "drizzle-kit": "^0.30.0",
    "wrangler": "^3.0.0"
  }
}
```

---

## 内部共享包

所有 Deepractice 项目必须使用以下内部包，确保代码风格和架构一致。

### @deepractice/ddd

DDD（领域驱动设计）构建块。

```bash
bun add @deepractice/ddd
```

```typescript
import { Entity, Id, NotFoundError, ValidationError } from "@deepractice/ddd";

// Entity - 有身份标识的领域对象
class User extends Entity {
  constructor(
    id: string,
    public email: string,
    public name: string
  ) {
    super(id);
  }

  static create(email: string, name: string): User {
    return new User(Id.generate("usr"), email, name);
  }
}

// Id - 生成带前缀的唯一标识
Id.generate("usr"); // "usr_V1StGXR8_Z5jdHi"
Id.generate("team"); // "team_R7hY4tKm_8JnPxQ"
Id.isValid("usr_V1StGXR8_Z5jdHi", "usr"); // true

// Domain Errors - 自动映射到 HTTP 状态码
// ValidationError     → 400 Bad Request
// AuthenticationError → 401 Unauthorized
// ForbiddenError      → 403 Forbidden
// NotFoundError       → 404 Not Found
// ConflictError       → 409 Conflict
```

**ID 前缀约定**：`usr_`（用户）、`team_`（团队）、`key_`（API Key）、`sess_`（会话）

---

### @deepractice/di

依赖注入容器，封装 TSyringe，支持 Cloudflare Workers。

```bash
bun add @deepractice/di
```

**tsconfig.json 配置**（必须）：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**入口文件导入 polyfill**（必须是第一个 import）：

```typescript
// src/index.ts
import "@deepractice/di/polyfill";
```

**定义可注入类**：

```typescript
import { injectable, inject, container } from "@deepractice/di";

@injectable()
class AuthService {
  constructor(
    @inject("UserRepository") private userRepo: UserRepository,
    @inject("SessionRepository") private sessionRepo: SessionRepository
  ) {}
}
```

**注册和解析**：

```typescript
// 注册实现
container.register("UserRepository", { useClass: D1UserRepository });
container.register("SessionRepository", { useClass: D1SessionRepository });

// 解析（依赖自动注入）
const authService = container.resolve(AuthService);
```

**Cloudflare Workers 中使用**：

```typescript
import "@deepractice/di/polyfill";
import { container } from "@deepractice/di";

export default {
  async fetch(request: Request, env: Env) {
    // 注册运行时依赖
    container.register("DB", { useValue: env.DB });

    const authService = container.resolve(AuthService);
    // ...
  },
};
```

---

### @deepractice/compat

跨运行时兼容性层，处理 Bun、Node.js、Cloudflare Workers 的差异。

```bash
bun add @deepractice/compat
```

**SQLite 跨运行时**：

```typescript
import { openDatabase } from "@deepractice/compat/sqlite";

// 自动检测运行时：
// - Bun → bun:sqlite
// - Node.js → better-sqlite3
const db = openDatabase(":memory:"); // 内存数据库
const db = openDatabase("./data.db"); // 文件数据库

db.exec("CREATE TABLE users (id INTEGER, name TEXT)");
const stmt = db.prepare("INSERT INTO users VALUES (?, ?)");
stmt.run(1, "Alice");
```

**与 Drizzle 配合**：

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import { openDatabase } from "@deepractice/compat/sqlite";

const sqlite = openDatabase(":memory:");
const db = drizzle(sqlite, { schema });
```

**使用场景**：

- BDD 测试需要在 Node.js (cucumber-js) 运行
- 开发环境用 Bun
- 生产环境用 Cloudflare D1

---

### @deepractice/logger

跨平台日志门面，支持 Cloudflare Workers、Node.js、浏览器。

```bash
bun add @deepractice/logger
```

```typescript
import { createLogger, setLoggerFactory, ConsoleLoggerFactory } from "@deepractice/logger";

// 应用启动时配置（可选）
setLoggerFactory(
  new ConsoleLoggerFactory({
    level: "info",
    context: { service: "identity" },
  })
);

// 在任何文件中使用
const logger = createLogger("AuthService");

logger.debug("Debug message");
logger.info("User logged in", { userId: "123" });
logger.warn("Rate limit approaching");
logger.error("Failed to authenticate", { error: err.message });
```

**测试中使用 Mock**：

```typescript
import { MockLoggerFactory, setLoggerFactory } from "@deepractice/logger";

const mockFactory = new MockLoggerFactory();
setLoggerFactory(mockFactory);

// 断言日志被调用
expect(mockFactory.hasLoggedMessage("User logged in")).toBe(true);
```

---

### @deepractice/bdd

零配置 BDD 测试运行器，基于 Cucumber。

```bash
bun add @deepractice/bdd
```

**目录结构**：

```
your-service/
├── src/
├── bdd/
│   ├── features/*.feature    # Gherkin 特性文件
│   ├── steps/*.steps.ts      # Step 定义
│   └── support/world.ts      # 测试上下文（可选）
└── package.json
```

**package.json**：

```json
{
  "scripts": {
    "test:bdd": "deepractice-bdd"
  }
}
```

**运行测试**：

```bash
bun run test:bdd                      # 运行所有测试
bun run test:bdd --tags @auth         # 运行指定 tag
bun run test:bdd --tags "not @skip"   # 排除 tag
```

**Step 定义**：

```typescript
import { Given, When, Then, World } from "@deepractice/bdd";
// 或使用中文别名
import { 假设, 当, 那么 } from "@deepractice/bdd";

Given("用户已登录", async function (this: World) {
  // 前置条件
});

When("用户请求 {string}", async function (this: World, path: string) {
  // 执行动作
});

Then("应返回状态码 {int}", async function (this: World, status: number) {
  // 验证结果
});
```

---

### @deepractice/design-tokens

统一设计系统，包含颜色、字体、间距等设计令牌。

```bash
bun add @deepractice/design-tokens
```

**CSS 变量**：

```css
/* globals.css */
@import "@deepractice/design-tokens/css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Tailwind 配置**：

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";
import { preset } from "@deepractice/design-tokens/tailwind";

const config: Config = {
  presets: [preset as Config],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;
```

**TypeScript 中使用**：

```typescript
import { colors, typography, spacing } from "@deepractice/design-tokens";

// colors.primary.DEFAULT = "#22c55e"
// typography.fontFamily.sans = "Inter, ..."
// spacing[4] = "16px"
```

**主色调**：绿色 `#22c55e`，代表开源社区的成长与活力。

---

## 数据库和测试最佳实践

### 核心原则

**生产代码 (src/) 不包含测试逻辑，测试代码 (bdd/) 自己管理依赖。**

### 数据库架构

```
测试环境: Drizzle + SQLite :memory: (via @deepractice/compat)
生产环境: Drizzle + Cloudflare D1
```

**关键优势**：

- ✅ 只维护一套 Repository 实现
- ✅ BDD 测试快速（内存数据库）
- ✅ 测试和生产用相同的 ORM 逻辑

### 文件组织

```
services/account/
├── src/                                    # 生产代码
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── schema.ts                   # ✅ 唯一要维护的 schema
│   │   ├── repositories/
│   │   │   ├── DrizzleUserRepository.ts    # ✅ 统一实现
│   │   │   └── ...
│   │   └── container/
│   │       ├── tokens.ts                   # DI tokens
│   │       └── index.ts                    # registerProductionDependencies()
│   └── ...
├── bdd/                                    # 测试代码（自管理）
│   ├── features/
│   ├── steps/
│   └── support/
│       ├── database.ts                     # createTestDatabase()
│       ├── container.ts                    # 测试 DI 配置
│       └── world.ts                        # 导出给 steps 用
└── drizzle/                                # 自动生成的 migrations
    └── 0000_xxx.sql
```

### Migrations 管理流程

**1. 修改 schema**：

```typescript
// src/infrastructure/database/schema.ts
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // ... 添加新字段
});
```

**2. 生成 migration**：

```bash
bun run db:generate
# → drizzle-kit 对比 schema 和数据库，生成 SQL
# → drizzle/0001_xxx.sql
```

**3. 应用到本地 D1**：

```bash
bun run db:migrate
# → wrangler d1 migrations apply account-deepractice-dev --local
```

**4. 部署到生产**：

```bash
wrangler deploy
# → 自动应用 migrations 到远程 D1
```

### BDD 测试数据库配置

**bdd/support/database.ts**：

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import { openDatabase } from "@deepractice/compat/sqlite";
import * as schema from "../../src/infrastructure/database/schema";

export function createTestDatabase() {
  const sqlite = openDatabase(":memory:");
  const db = drizzle(sqlite, { schema });

  // 执行建表 SQL（不通过 migrations）
  sqlite.exec(`CREATE TABLE users (...)`);

  return db;
}

export function clearTestDatabase(db) {
  // 清空所有表
  db.$client.exec(`DELETE FROM users; DELETE FROM sessions;`);
}
```

**bdd/support/container.ts**：

```typescript
import "@deepractice/di/polyfill";
import { container } from "@deepractice/di";
import { createTestDatabase } from "./database";

const testDb = createTestDatabase();

container.register(TOKENS.DB, { useValue: testDb });
container.registerSingleton(TOKENS.UserRepository, DrizzleUserRepository);
// ...

export { container, testDb };
```

### 关键点

| 要点            | 说明                                       |
| --------------- | ------------------------------------------ |
| **Schema 唯一** | 只维护 `schema.ts`，migrations 自动生成    |
| **测试隔离**    | 测试配置在 `bdd/support/`，不污染 `src/`   |
| **统一 ORM**    | 测试和生产用同一套 Drizzle Repository      |
| **内存快速**    | BDD 测试用 `:memory:`，0.05s 跑完 81 steps |

---

## 角色定义

| 角色          | 担任者 | 职责                              |
| ------------- | ------ | --------------------------------- |
| **Reviewer**  | Claude | 审查代码/设计，发现问题，提出疑问 |
| **Architect** | 用户   | 解答问题，做决策，确定方案        |
| **Developer** | Claude | 实现代码，编写测试                |

---

## 开发流程

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 需求澄清 (Code Review Mode)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Reviewer 阅读相关代码/文档                              │
│           ↓                                                 │
│  2. 发现问题，提出疑问（使用问题格式）                      │
│           ↓                                                 │
│  3. Architect 解答，做出决策                                │
│           ↓                                                 │
│  4. Reviewer 确认理解，追问直到清晰                         │
│           ↓                                                 │
│  5. 方案确定，进入 Phase 2                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 行为定义 (BDD)                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 编写 .feature 文件描述期望行为                          │
│           ↓                                                 │
│  2. Architect 确认 feature 正确                             │
│           ↓                                                 │
│  3. 实现 step definitions（如需要）                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 实现 (TDD)                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 运行测试（预期失败）                                    │
│           ↓                                                 │
│  2. 实现代码                                                │
│           ↓                                                 │
│  3. 运行测试（通过 = 完成）                                 │
│           ↓                                                 │
│  4. 重构（保持测试通过）                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Code Review 模式

### 问题分类

| 类型     | 描述                     | 示例                              |
| -------- | ------------------------ | --------------------------------- |
| **盲点** | 缺失的逻辑，没想到的场景 | "断线重连时 cursor 怎么恢复？"    |
| **架构** | 职责模糊，依赖混乱       | "Queue 和 Network 谁负责路由？"   |
| **功能** | 接口定义了但没实现       | "handleConnection 方法未实现"     |
| **坑**   | 潜在 bug，边界条件       | "多 tab 共享 localStorage 会冲突" |

### 提问格式

```markdown
**问题 N：[简短标题]**

**代码位置**：`path/to/file.ts:line`

**问题描述**：
[具体描述问题是什么]

**涉及的关键点**：

1. 点 1
2. 点 2
3. 点 3

**状态**：待解答
```

### 原则

1. **问题驱动** - 带着批判性思维找问题，不是漫无目的读代码
2. **不轻易动手** - 方案没确定之前不执行
3. **持续追问** - 一个问题可以追问多轮，直到完全理解
4. **收敛机制** - 通过 API 边界来收紧问题范围

---

## Phase 2: BDD 模式

### BDD vs Unit 测试边界

| 测试类型 | 测试层级       | 视角       |
| -------- | -------------- | ---------- |
| **BDD**  | 最外层 API/APP | 用户视角   |
| **Unit** | 内部模块       | 开发者视角 |

**BDD 测试原则**：

- 只通过最外层公开 API 测试，不测试内部模块
- 测试用户可见的行为，不测试实现细节
- 这样做有助于从用户视角审视 API 设计

**Unit 测试原则**：

- 测试内部模块的具体实现
- 可以 mock 依赖，关注边界条件

### Feature 文件结构

```gherkin
@tag
Feature: 功能名称
  功能描述（一两句话说明这个功能是什么）

  Background:
    Given 前置条件（所有场景共享）

  @scenario-tag
  Scenario: 场景名称
    Given 前置条件
    When 执行动作
    Then 期望结果
    And 更多期望
```

### 文件组织

```
bdd/
├── features/
│   ├── auth.feature
│   ├── user.feature
│   └── ...
├── steps/
│   ├── auth.steps.ts
│   ├── user.steps.ts
│   └── common.steps.ts
└── support/
    └── world.ts              # 测试上下文
```

### 编写原则

1. **业务语言** - 用业务术语，不用技术细节
2. **独立场景** - 每个 Scenario 独立，不依赖执行顺序
3. **声明式** - 描述"什么"，不描述"怎么做"
4. **可读性** - 非技术人员也能理解

### 示例

```gherkin
@auth
Feature: 用户认证
  用户可以通过邮箱登录系统

  Scenario: 使用有效凭证登录
    Given 用户 "test@example.com" 已注册
    When 使用密码 "password123" 登录
    Then 应返回成功响应
    And 响应中应包含 JWT token
```

---

## Phase 3: 实现

### 流程

```bash
# 1. 运行测试（预期失败）
bun run test:bdd --tags "@feature-tag"

# 2. 实现代码
# ... 编写实现 ...

# 3. 运行测试（通过）
bun run test:bdd --tags "@feature-tag"

# 4. 运行全部测试确保没有破坏其他功能
bun run test
```

### 原则

1. **最小实现** - 只实现让测试通过的代码
2. **不过度设计** - 不为假想的未来需求写代码
3. **持续重构** - 测试通过后可以重构，保持测试绿色

---

## 服务层架构

每个服务遵循严格的 DDD 分层架构：

```
src/
├── domain/                  # 业务逻辑 & 实体
│   ├── [Entity].ts          # 领域实体 (extend Entity)
│   └── [Entity]Repository.ts # 仓储接口
├── application/             # 应用服务层
│   └── [Service].ts         # 编排领域实体
├── infrastructure/          # 基础设施实现
│   ├── database/
│   │   ├── schema/          # Drizzle 表定义
│   │   └── client.ts        # D1 数据库工厂
│   └── repositories/        # 仓储实现
├── interfaces/http/         # HTTP 层
│   ├── routes/              # 端点处理器
│   ├── middleware/          # 认证、错误处理
│   └── utils/               # 响应帮助函数
└── types/env.ts             # Cloudflare 绑定
```

---

## 完整开发流程

### Step 0: Issue 创建

```bash
# 创建 issue 文档（如果还没有）
# issues/xxx-feature-name.md
```

**内容**：

- 背景和痛点
- 期望用法
- 设计方案
- 实现步骤

### Step 1: 创建分支

```bash
git checkout main
git pull
git checkout -b feat/feature-name
```

### Step 2: Phase 1 - 需求澄清（Code Review）

1. Reviewer（Claude）阅读相关代码/文档/issue
2. 发现问题，提出疑问（使用问题格式）
3. Architect（用户）解答，做决策
4. 确认方案，进入 Phase 2

### Step 3: Phase 2 - 行为定义（BDD）

```bash
# 1. 编写 feature 文件
# bdd/features/feature-name.feature

# 2. 运行测试（预期失败，step 未定义）
bun run test:bdd --tags "@feature-tag"

# 3. 实现 step definitions（如需要）
# bdd/steps/feature-name.steps.ts
```

### Step 4: Phase 3 - 实现（TDD）

```bash
# 1. 运行测试（预期失败）
bun run test:bdd --tags "@feature-tag"

# 2. 实现代码（使用 @deepractice/* 包）
# src/domain/...
# src/application/...

# 3. 运行测试直到通过
bun run test:bdd --tags "@feature-tag"

# 4. 运行全部测试确保没破坏其他功能
bun run test
```

### Step 5: 代码质量检查

```bash
# TypeCheck
bun run typecheck

# Format
bun run format
```

### Step 6: 更新文档

需要更新的文档：

- `README.md` - 如果有新功能/API
- `CLAUDE.md` - 如果架构变化
- `issues/xxx.md` - 更新 issue 状态

### Step 7: 写 Changeset

```bash
# 手动创建 changeset
# .changeset/feature-name.md

---
"packageName": patch|minor|major
---

Description of changes
```

**版本规则**：

- `patch` - Bug 修复和内部改进
- `minor` - 新功能和增强
- `major` - Breaking changes

### Step 8: 提交代码

```bash
git add .
git status  # 检查要提交的文件
git commit -m "feat: feature description

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit 规范**：

- 遵循 Conventional Commits
- `feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`

### Step 9: 推送和创建 PR

```bash
# 推送分支
git push -u origin feat/feature-name

# 创建 PR
gh pr create --title "feat: feature description" --body "..."
```

**PR 检查**：

- ✅ CI 通过（typecheck, test, build）
- ✅ Changeset 存在（自动检查）

### Step 10: 合并

```bash
# PR approved 后合并
gh pr merge --squash

# 切回 main 并更新
git checkout main
git pull

# 删除本地分支
git branch -d feat/feature-name
```

---

## 快速参考

### 新服务初始化

```bash
# 1. 添加内部包依赖
bun add @deepractice/ddd @deepractice/logger @deepractice/bdd

# 2. 前端项目额外添加
bun add @deepractice/design-tokens

# 3. 创建 bdd 目录结构
mkdir -p bdd/{features,steps,support}

# 4. 添加 scripts
# "test:bdd": "deepractice-bdd"
```

### 开发新功能（完整版）

```
1. Issue 创建 → 拉分支
2. Code Review: 讨论需求，确定方案
3. BDD: 写 .feature 文件
4. 实现: 让测试通过
5. 质量检查: typecheck, format
6. 更新文档
7. 写 changeset
8. 提交 → PR → 合并
```

### 修复 Bug

```
1. 写一个失败的测试用例（复现 bug）
2. 修复代码
3. 测试通过 = bug 已修复
4. 提交
```

### 重构

```
1. 确保现有测试全部通过
2. 重构代码
3. 运行测试，保持绿色
4. 提交
```

---

## 命令速查

```bash
# 运行 BDD 测试
bun run test:bdd
bun run test:bdd --tags "@auth"
bun run test:bdd --tags "not @skip"

# 运行单元测试
bun run test

# 类型检查
bun run typecheck

# 格式化
bun run format
```

---

## 何时使用这个模式

| 场景       | 是否使用                          |
| ---------- | --------------------------------- |
| 新功能开发 | ✅ 完整流程                       |
| Bug 修复   | ✅ 简化版（写测试 → 修复 → 通过） |
| 重构       | ✅ 确保测试通过                   |
| 探索性调研 | ❌ 不需要，直接探索               |
| 紧急修复   | ⚠️ 可跳过 BDD，但事后补测试       |

---

## 相关文件

- `packages/ddd/` - DDD 构建块
- `packages/bdd/` - BDD 测试框架
- `packages/logger/` - 日志系统
- `packages/design-tokens/` - 设计令牌
- `bdd/features/` - Feature 文件
- `bdd/steps/` - Step 实现
