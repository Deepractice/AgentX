# Issue #043: Extract Persistence to Independent Package

**Status**: Completed
**Priority**: High
**Created**: 2025-12-28
**Related**: #042 (Binary Distribution)

---

## Problem

`@agentxjs/runtime` 的 `PersistenceImpl` 在一个 switch 中包含所有 storage driver 的 dynamic import：

```typescript
switch (driver) {
  case "memory": return createStorage();
  case "sqlite": await import("db0/connectors/bun-sqlite"); ...
  case "redis": await import("unstorage/drivers/redis");      // 依赖 ioredis
  case "mysql": await import("db0/connectors/mysql2");        // 依赖 mysql2
  case "postgresql": await import("db0/connectors/postgresql"); // 依赖 pg
}
```

**问题：**

1. Bun 编译二进制时会静态分析所有 import 路径
2. 即使只用 sqlite，也会尝试解析 redis/mysql/pg 的依赖
3. 导致 portagent 二进制运行时报错 `Cannot find module 'mysql2/promise'`

---

## Solution

将 Persistence 拆分为独立包 `@agentxjs/persistence`，每个 driver 作为子路径导出。

### Package Structure

```
packages/
├── persistence/                    # @agentxjs/persistence
│   ├── src/
│   │   ├── index.ts               # 核心接口 + createPersistence
│   │   ├── Persistence.ts         # Persistence 实现
│   │   ├── repository/
│   │   │   ├── ImageRepository.ts
│   │   │   ├── ContainerRepository.ts
│   │   │   └── SessionRepository.ts
│   │   └── drivers/
│   │       ├── memory.ts          # 默认，无外部依赖
│   │       ├── fs.ts              # Node.js fs，无外部依赖
│   │       ├── sqlite.ts          # 依赖 db0 + bun-sqlite
│   │       ├── redis.ts           # 依赖 ioredis
│   │       ├── mongodb.ts         # 依赖 mongodb
│   │       ├── mysql.ts           # 依赖 mysql2
│   │       └── postgresql.ts      # 依赖 pg
│   └── package.json
├── runtime/                        # 依赖 @agentxjs/persistence
├── network/                        # 已有独立包
└── ...
```

### Package Exports

**package.json:**

```json
{
  "name": "@agentxjs/persistence",
  "exports": {
    ".": "./dist/index.js",
    "./sqlite": "./dist/drivers/sqlite.js",
    "./redis": "./dist/drivers/redis.js",
    "./mongodb": "./dist/drivers/mongodb.js",
    "./mysql": "./dist/drivers/mysql.js",
    "./postgresql": "./dist/drivers/postgresql.js"
  },
  "dependencies": {
    "unstorage": "^1.14.4"
  },
  "peerDependencies": {
    "db0": "^0.2.0"
  },
  "peerDependenciesMeta": {
    "db0": { "optional": true },
    "ioredis": { "optional": true },
    "mongodb": { "optional": true },
    "mysql2": { "optional": true },
    "pg": { "optional": true }
  }
}
```

---

## API Design

### Core API (index.ts)

```typescript
import type { Storage } from "unstorage";

export interface PersistenceDriver {
  createStorage(): Promise<Storage>;
}

export interface Persistence {
  readonly images: ImageRepository;
  readonly containers: ContainerRepository;
  readonly sessions: SessionRepository;
}

// 核心函数，接收 driver 实例
export function createPersistence(driver: PersistenceDriver): Promise<Persistence>;

// 默认导出 memory driver（无依赖）
export { memoryDriver } from "./drivers/memory";
```

### Driver API (drivers/sqlite.ts)

```typescript
import type { PersistenceDriver } from "../index";

export interface SqliteDriverOptions {
  path: string;
}

export function sqliteDriver(options: SqliteDriverOptions): PersistenceDriver {
  return {
    async createStorage() {
      const { createStorage } = await import("unstorage");
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      const { default: bunSqlite } = await import("db0/connectors/bun-sqlite");

      const database = createDatabase(bunSqlite({ name: options.path }));
      return createStorage({ driver: db0Driver({ database }) });
    },
  };
}
```

### Usage Examples

**Default (memory):**

```typescript
import { createPersistence, memoryDriver } from "@agentxjs/persistence";

const persistence = await createPersistence(memoryDriver());
```

**SQLite:**

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { sqliteDriver } from "@agentxjs/persistence/sqlite";

const persistence = await createPersistence(sqliteDriver({ path: "./data/agentx.db" }));
```

**Redis:**

```typescript
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";

const persistence = await createPersistence(redisDriver({ url: "redis://localhost:6379" }));
```

---

## Integration with AgentX

### createLocalAgentX (agentx package)

```typescript
// 默认使用 sqlite，直接 import sqlite driver
export async function createLocalAgentX(config: LocalConfig): Promise<AgentX> {
  let persistence: Persistence;

  if (config.persistence) {
    // 用户显式指定
    persistence = config.persistence;
  } else {
    // 默认 sqlite
    const { createPersistence } = await import("@agentxjs/persistence");
    const { sqliteDriver } = await import("@agentxjs/persistence/sqlite");

    const storagePath = join(config.agentxDir ?? "~/.agentx", "data", "agentx.db");
    persistence = await createPersistence(sqliteDriver({ path: storagePath }));
  }

  // ...
}
```

### User API (unchanged for default case)

```typescript
// 默认场景：用户无感知，内部自动用 sqlite
const agentx = await createAgentX({
  llm: { apiKey },
  agentxDir: "~/.agentx",
});

// 高级场景：用户显式指定 driver
import { createPersistence } from "@agentxjs/persistence";
import { redisDriver } from "@agentxjs/persistence/redis";

const agentx = await createAgentX({
  llm: { apiKey },
  persistence: await createPersistence(redisDriver({ url: "..." })),
});
```

---

## Migration Path

### Phase 1: Create Package

1. 创建 `packages/persistence/` 目录结构
2. 从 `packages/runtime/src/internal/persistence/` 迁移代码
3. 实现 driver 子路径导出

### Phase 2: Update Dependencies

1. `@agentxjs/runtime` 添加依赖 `@agentxjs/persistence`
2. 删除 runtime 中的 persistence 代码
3. 更新 runtime 导出

### Phase 3: Update AgentX

1. 更新 `createLocalAgentX` 使用新 API
2. 添加 `persistence` 配置选项
3. 保持向后兼容（默认 sqlite）

### Phase 4: Test Binary Build

1. 重新构建 portagent 二进制
2. 验证不再包含未使用的 driver 依赖
3. 测试运行

---

## Benefits

| Aspect     | Before                     | After                      |
| ---------- | -------------------------- | -------------------------- |
| 包结构     | driver 混在 runtime 里     | 独立 @agentxjs/persistence |
| 依赖       | 所有 driver 依赖都会被分析 | 只打包用到的 driver        |
| 二进制大小 | 包含无用依赖               | 精确控制                   |
| 扩展性     | 改 switch 加 case          | 新建 driver 文件           |
| 风格       | 与 network 不一致          | 统一的包结构               |

---

## Package Dependency Graph (After)

```
@agentxjs/types
    ↓
@agentxjs/common
    ↓
@agentxjs/persistence  ← 新包
    ↓
@agentxjs/agent
    ↓
@agentxjs/agentx
    ↓
@agentxjs/runtime ← 依赖 persistence
    ↓
@agentxjs/ui
```

---

## Tasks

- [x] Create `packages/persistence/` directory structure
- [x] Implement core Persistence interface and createPersistence
- [x] Implement memory driver (default, no deps)
- [x] Implement sqlite driver (db0 + bun-sqlite)
- [x] Implement redis driver (ioredis)
- [x] Implement mongodb driver (mongodb)
- [x] Implement mysql driver (mysql2)
- [x] Implement postgresql driver (pg)
- [x] Configure package.json exports
- [x] Update @agentxjs/runtime to use new package
- [x] Update @agentxjs/agentx createLocalAgentX
- [ ] Add persistence config option to AgentXConfig
- [x] Update CLAUDE.md package dependency graph
- [x] Test binary build with new structure
