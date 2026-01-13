# 049 - Refactor Event Broadcast Architecture

**状态**: 设计中
**优先级**: Medium
**创建时间**: 2026-01-13
**标签**: `architecture`, `refactoring`, `queue`

---

## 问题分析

### 当前架构的混乱

引入 Queue 后，`broadcastable` 字段的使用变得重复和混乱：

```typescript
// createLocalAgentX.ts:114 - 过滤1：入队列前
runtime.onAny((event) => {
  if (broadcastable === false) return;  // ← 过滤内部事件
  eventQueue.append(topic, event);
});

// createLocalAgentX.ts:145 - 过滤2：用户订阅时（刚加的）
on: (type, handler) => {
  return runtime.on(type, (event) => {
    if (broadcastable === false) return;  // ← 又过滤一次
    handler(event);
  });
},
```

**问题**：

1. **重复过滤** - 两个地方检查 `broadcastable`
2. **路径不一致**：
   - **Local mode**: `agentx.on()` → `runtime.on()` → 需要手动过滤
   - **Remote mode**: `agentx.on()` → Queue → 自动只有外部事件
3. **概念混淆** - Queue 已经是"外部事件存储"，但还需要 `broadcastable` 标记

### 核心洞察

**Queue 引入后，应该用"是否入队列"来区分内外部事件，而不是 `broadcastable` 字段。**

```
Internal Events (不入队列):
  - DriveableEvent (broadcastable: false)
  - 只给 BusDriver → AgentEngine 处理
  - 不给用户

External Events (入队列):
  - BusPresenter 处理后的事件
  - Command responses
  - Session lifecycle
  - 给用户消费
```

---

## 真实架构分析

### 事件流

```
┌──────────────────────────────────────────────────────────────┐
│ 当前事件流（有 broadcastable 过滤）                           │
└──────────────────────────────────────────────────────────────┘

ClaudeReceptor/MockEffector
  │ emit DriveableEvent (broadcastable: false)
  ▼
SystemBus (RuntimeImpl)
  │
  ├──→ BusDriver (filter by agentId)
  │      │
  │      ▼
  │    AgentEngine (MealyMachine)
  │      │
  │      ▼
  │    BusPresenter (emit transformed events, broadcastable: true)
  │      │
  │      ▼
  │    SystemBus
  │
  └──→ createLocalAgentX.runtime.onAny()
         │ filter: broadcastable !== false
         ▼
       EventQueue.append()  ← 只存外部事件
         │
         ├──→ Local: agentx.on() → runtime.on() (需要再过滤)
         └──→ Remote: WebSocket → Queue.subscribe()
```

### broadcastable 使用统计

| Component       | Sets broadcastable: false | Count           |
| --------------- | ------------------------- | --------------- |
| ClaudeReceptor  | All DriveableEvents       | 11 events       |
| AgentInteractor | user_message, interrupt   | 2 events        |
| MockEffector    | All mock events           | Variable        |
| **Total**       |                           | ~13 event types |

| Component                        | Reads broadcastable | Purpose      |
| -------------------------------- | ------------------- | ------------ |
| createLocalAgentX (queue filter) | Line 116            | Skip入队列   |
| createLocalAgentX (on filter)    | Line 149            | Skip用户订阅 |
| **Total**                        |                     | 2 places     |

---

## 重构方案

### 核心思想

**"Queue 就是外部事件的边界"**

- 不入队列 = 内部事件（只给 Runtime 内部处理）
- 入队列 = 外部事件（给用户消费）

**统一 Local 和 Remote 路径**：都从 Queue 消费。

### 方案 A：Local mode 从 Queue 消费（推荐）

#### 实现

```typescript
// createLocalAgentX.ts

// 为 local mode 创建一个内部消费者
const localConsumerId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

return {
  on: (type, handler) => {
    // Local mode 也从 Queue 消费（和 Remote 一致）
    // 订阅所有 topics（"global" + active sessionIds）
    const subscriptions: Map<string, () => void> = new Map();

    // Subscribe to global topic
    const unsubGlobal = eventQueue.subscribe(localConsumerId, "global", (entry) => {
      if (entry.event.type === type || type === "*") {
        handler(entry.event);
        // Auto ACK
        eventQueue.ack(localConsumerId, "global", entry.cursor);
      }
    });
    subscriptions.set("global", unsubGlobal);

    // TODO: Subscribe to session topics when images are activated

    return () => {
      for (const unsub of subscriptions.values()) {
        unsub();
      }
      subscriptions.clear();
    };
  },

  // ... other methods unchanged
};
```

#### 优势

1. ✅ **统一路径** - Local 和 Remote 都从 Queue 消费
2. ✅ **自动过滤** - Queue 只存外部事件，不需要 broadcastable 检查
3. ✅ **可靠性** - Local 订阅也获得持久化（虽然用处不大）
4. ✅ **简化代码** - 移除重复的 broadcastable 过滤

#### 劣势

1. ⚠️ **性能** - Local mode 多了 Queue 读写开销（可忽略）
2. ⚠️ **复杂度** - 需要管理 topic 订阅（global + sessions）

### 方案 B：保留 broadcastable，简化过滤（当前）

#### 实现

```typescript
// 当前方案（已实现）

// 只在入队列前检查一次
runtime.onAny((event) => {
  if (broadcastable === false) return;
  eventQueue.append(topic, event);
});

// Local on() 也过滤
on: (type, handler) => {
  return runtime.on(type, (event) => {
    if (broadcastable === false) return;
    handler(event);
  });
},
```

#### 优势

1. ✅ **简单** - 只需一行过滤
2. ✅ **性能** - Local 直接订阅 Runtime（零延迟）
3. ✅ **清晰** - broadcastable 语义明确

#### 劣势

1. ❌ **重复过滤** - 两个地方检查 broadcastable
2. ❌ **路径不一致** - Local 和 Remote 实现不同

### 方案 C：移除 broadcastable，用 source/category 判断（激进）

#### 思路

```typescript
function isInternalEvent(event: SystemEvent): boolean {
  // Internal events:
  // 1. DriveableEvent (source: environment, broadcastable: false)
  // 2. user_message/interrupt (source: agent, intent: request)
  return (
    (event.source === "environment" && event.category === "stream") ||
    (event.source === "agent" && event.intent === "request")
  );
}

// 入队列过滤
runtime.onAny((event) => {
  if (isInternalEvent(event)) return;
  eventQueue.append(topic, event);
});
```

#### 优势

1. ✅ **语义化** - 用 source/category/intent 判断，更清晰
2. ✅ **移除字段** - 不需要 broadcastable

#### 劣势

1. ❌ **脆弱** - 依赖多个字段组合，容易出错
2. ❌ **不灵活** - 无法针对单个事件控制

---

## 推荐方案

### 短期（当前 Phase）：方案 B（已实现）

**理由**：

- 最小改动
- 修复了重复事件 bug
- broadcastable 语义清晰

**已完成**：

- ✅ createLocalAgentX.on() 过滤 broadcastable: false
- ✅ MockEffector 设置 broadcastable: false
- ✅ 测试通过（42/56）

### 长期（未来优化）：方案 A（Local 从 Queue 消费）

**理由**：

- 统一 Local/Remote 架构
- 简化代码（移除过滤逻辑）
- Local 也获得可靠性（bonus）

**实施计划**：

1. 重构 createLocalAgentX.on() 使用 eventQueue.subscribe()
2. 支持多 topic 订阅（global + sessions）
3. 测试验证性能影响
4. 考虑移除 broadcastable 字段（breaking change）

---

## 事件分类规范

### Internal Events（不入队列）

**DriveableEvent** (source: "environment", category: "stream", broadcastable: false):

- `message_start`, `text_delta`, `message_stop`
- `text_content_block_start/stop`
- `tool_use_content_block_start/stop`
- `input_json_delta`
- `tool_call`, `tool_result`
- `interrupted`, `error_received`

**Control Events** (source: "agent", intent: "request", broadcastable: false):

- `user_message` - 触发 ClaudeEffector 发送消息
- `interrupt` - 中断 Agent

### External Events（入队列）

**Stream Events** (source: "agent", category: "stream"):

- 同名事件（message_start, text_delta 等），但已经过 MealyMachine 处理

**State Events** (source: "agent", category: "state"):

- `conversation_start`, `conversation_thinking`, `tool_executing`, `conversation_end`, `error_occurred`

**Message Events** (source: "agent", category: "message"):

- `assistant_message`, `tool_call_message`, `tool_result_message`, `error_message`

**Turn Events** (source: "agent", category: "turn"):

- `turn_request`, `turn_response`

**Session Events** (source: "session"):

- `session_created`, `session_resumed`, `session_destroyed`
- `message_persisted`

**Command Events** (source: "command"):

- All request/response pairs（container, image, agent commands）

---

## 决策

### 当前方案（已实现）

保留 `broadcastable` 字段，在两处过滤：

1. 入队列前（createLocalAgentX.ts:116）
2. 用户订阅时（createLocalAgentX.ts:149）

### 未来优化（可选）

- [ ] Local mode 从 Queue 消费（统一架构）
- [ ] 移除 broadcastable 字段（breaking change）
- [ ] 用 EventFilter 抽象替代

---

## 相关 Issue

- #046 - Queue MQ Architecture
- #048 - Mock Environment for BDD

---

## 当前状态

- [x] 分析 broadcastable 使用情况
- [x] 识别问题和改进机会
- [x] 实现短期方案（过滤 broadcastable）
- [ ] 实现长期方案（Local 从 Queue 消费）
