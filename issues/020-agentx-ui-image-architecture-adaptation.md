# AgentX-UI Image 架构适配

## 背景

基于 Issue #019 的 Docker-style 分层架构已实现：

```
Definition → build → Image → run → Agent
                       ↓
                   Session (userId + imageId)
```

**核心变更：**

- `Session.agentId` → `Session.imageId`
- `Session` 新增 `userId` 字段
- `SessionManager` API 变更：
  - `create(imageId, userId)` 替代 `create(agentId)`
  - `listByImage(imageId)` 替代 `listByAgent(agentId)`
  - 新增 `listByUser(userId)`
- `Session` 新增 `fork()` 方法

## 影响范围

### 需要修改的文件 (9 个)

#### 1. 类型定义 (Critical)

**`src/components/chat/container/types.ts`**

```typescript
// Before
export interface SessionItem {
  sessionId: string;
  agentId: string; // ❌ 需要改
  title: string | null;
  createdAt: number;
  updatedAt: number;
}

// After
export interface SessionItem {
  sessionId: string;
  userId: string; // ✅ 新增
  imageId: string; // ✅ 替换 agentId
  title: string | null;
  createdAt: number;
  updatedAt: number;
}
```

#### 2. Hooks (Critical)

**`src/components/chat/container/useContainer.ts`**

需要更新：

- Session 过滤逻辑：`agentId` → `imageId`
- 新增方法：
  - `forkSession(sessionId: string)`
  - `listByUser(userId: string)`
  - `listByImage(imageId: string)`

```typescript
// Before
const filteredSessions = sessions.filter((s) => s.agentId === currentAgentId);

// After
const filteredSessions = sessions.filter(
  (s) => s.imageId === currentImageId && s.userId === currentUserId
);
```

#### 3. 组件 Props (High)

**`src/components/chat/container/Container.tsx`**

```typescript
// Before
interface ContainerProps {
  // ... existing props
}

// After
interface ContainerProps {
  userId: string; // ✅ 新增必需 prop
  // ... existing props
}
```

#### 4. 语义更新 (Medium)

以下文件需要更新文档和语义：

- `src/components/chat/container/panes/SessionPane.tsx`
- `src/components/chat/container/panes/DefinitionPane.tsx`
- `src/components/chat/container/panes/AgentPane.tsx`

DefinitionPane 现在实际上展示的是 Images 列表，考虑：

- 重命名为 `ImagePane.tsx`
- 或保持名称但更新内部逻辑

#### 5. Storybook Mock 数据 (Must Update)

以下 story 文件的 mock 数据需要更新：

- `src/components/chat/container/Container.stories.tsx`
- `src/components/chat/container/panes/SessionPane.stories.tsx`
- `src/components/chat/container/panes/AgentPane.stories.tsx`

```typescript
// Before
const mockSession: SessionItem = {
  sessionId: "session_1",
  agentId: "Claude", // ❌
  title: "Test Session",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// After
const mockSession: SessionItem = {
  sessionId: "session_1",
  userId: "user_default", // ✅
  imageId: "image_abc123", // ✅
  title: "Test Session",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### 不需要修改的文件 (102+ 个)

以下模块经验证无需修改：

- ✅ `hooks/useAgent.ts` - 仅关注 Agent 运行时
- ✅ `hooks/useAgentX.ts` - 平台级 hooks
- ✅ 所有 Message 组件 (`messages/`)
- ✅ 所有 Layout 组件 (`layout/`)
- ✅ 所有 Element 组件 (`elements/`)
- ✅ 所有 Typography/Input 组件

## Breaking Changes

| 变更                       | 影响                               | 解决方案                 |
| -------------------------- | ---------------------------------- | ------------------------ |
| `SessionItem.agentId` 移除 | 所有使用 agentId 的地方            | 改用 `imageId`           |
| `SessionItem.userId` 新增  | 必填字段                           | 从 context 或 props 传入 |
| `Container.userId` 新增    | 所有 Container 使用处              | 添加 userId prop         |
| Session 过滤逻辑           | 现在需要同时匹配 imageId 和 userId | 更新过滤条件             |

## 新功能支持

### 1. Session Fork

```typescript
// useContainer 新增
const forkSession = async (sessionId: string) => {
  const session = await agentx.sessions.get(sessionId);
  const forkedSession = await session.fork();
  // 刷新 session 列表
};
```

UI 上可以在 SessionPane 添加 Fork 按钮。

### 2. 多用户支持

```typescript
// Container 传入当前用户
<Container userId={currentUser.userId} ... />

// useContainer 按用户过滤
const userSessions = await agentx.sessions.listByUser(userId);
```

### 3. Image 版本追踪

Session 现在关联到特定 Image，可以：

- 显示 Session 使用的 Image 版本
- 支持从同一 Image 创建多个 Session

## 实现计划

### Phase 1: 类型和 Hooks (2.5 小时)

1. 更新 `types.ts` 中的 `SessionItem` 接口
2. 更新 `useContainer.ts` 的过滤逻辑
3. 添加 `Container.tsx` 的 `userId` prop
4. 运行 typecheck 确认编译通过

### Phase 2: 组件语义 (1 小时)

1. 更新 SessionPane 文档和变量名
2. 评估 DefinitionPane → ImagePane 重命名
3. 更新 AgentPane 显示 image 元数据

### Phase 3: Storybook 和验证 (1.5 小时)

1. 更新所有 story 文件的 mock 数据
2. 运行 Storybook 验证组件
3. 手动测试交互流程

**预计总工时：3.5-4 小时**

## 验收标准

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] Storybook 所有 stories 正常渲染
- [ ] Session 列表正确按 userId + imageId 过滤
- [ ] 新建 Session 正确关联 imageId 和 userId
- [ ] Fork Session 功能可用（如果实现）

## 相关文件

```
packages/agentx-ui/src/
├── components/
│   └── chat/
│       └── container/
│           ├── Container.tsx        # 添加 userId prop
│           ├── types.ts             # SessionItem 类型更新
│           ├── useContainer.ts      # 过滤逻辑更新
│           └── panes/
│               ├── SessionPane.tsx  # 语义更新
│               ├── DefinitionPane.tsx # 考虑重命名
│               └── AgentPane.tsx    # 显示 image 信息
└── hooks/
    ├── useAgent.ts                  # 无需修改
    └── useAgentX.ts                 # 无需修改
```

## 风险评估

**风险等级：低**

- 变更仅限于 container 层
- TypeScript 类型系统会捕获大部分错误
- Storybook 提供良好的测试覆盖
- 不影响 Agent/Driver 核心逻辑

## 参考

- Issue #019: AgentImage 架构设计
- ADR: `packages/agentx/src/index.ts`
- 类型定义: `packages/agentx-types/src/`
