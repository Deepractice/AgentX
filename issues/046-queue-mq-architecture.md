# Queue + MQ Architecture Design

**Issue**: #205 - Add @agentxjs/queue package for reliable event delivery
**Branch**: `feat/queue-package`
**Date**: 2026-01-12
**Status**: 架构重新设计中

---

## 背景

WebSocket 断连时消息丢失，需要可靠事件投递机制。

**问题复现**（`temp/reproduce-message-loss.ts`）：

- 客户端断开期间：消息丢失率 35.7%
- 重连后：无法恢复遗漏消息

---

## Phase 1: 初步实现（已完成）

### 实现内容

**包结构**：

- `@agentxjs/types/queue` - 类型定义
- `@agentxjs/queue` - SQLite 实现

**核心功能**：

- Cursor 机制：单调递增游标
- Topic 分区：按 sessionId
- 持久化：queue.db（独立存储）
- 订阅协议：subscribe/ack/unsubscribe

**验证**：

- ✅ 单元测试 7/7 通过
- ✅ 集成测试：0% 消息丢失

**Commits**: f2230928, 10f27938

### 架构图（初版）

```
Runtime → Queue.append(sessionId) → Queue.subscribe() → WebSocket.send()
```

---

## Phase 2: 架构重新审视（进行中）

### 核心洞察

**我们在实现的本质是 MQ**：

| MQ 特性  | 实现方式                   |
| -------- | -------------------------- |
| 持久化   | SQLite queue_entries 表    |
| 多消费者 | connectionId + cursor 追踪 |
| ACK 机制 | queue_ack 协议             |
| 断线恢复 | cursor-based replay        |
| 清理策略 | MIN(consumer cursors)      |

### 发现的问题

**问题 1：广播 vs Channel**

- 当前：全局广播，多个 tab 订阅同一个 session
- 问题：如何追踪每个 tab 的消费位置？
- 解决：需要 Channel 抽象

**问题 2：多消费者 ACK**

- 当前：一个 cursor 只能 ACK 一次
- 问题：连接 A ACK 后，连接 B 还没消费，消息能删吗？
- 解决：需要订阅表追踪每个连接的 cursor

**问题 3：Network 缺少 Channel 能力**

- 当前：只有 `broadcast(message)`
- 问题：无法定向发送给订阅某个 channel 的连接
- 解决：需要 `publish(channelId, message)`

---

## 新架构设计

### 1. 分层职责

```
┌─────────────────────────────────────────────────────────────┐
│  Runtime 层                                                 │
│  - 产生事件                                                 │
│  - 设置 event.context.channelId                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Queue 层 (MQ 实现)                                         │
│  - 持久化事件（按 topic 分区）                              │
│  - 追踪订阅（connectionId → cursor）                        │
│  - ACK 管理（每连接独立）                                   │
│  - 清理策略（MIN cursor 之前删除）                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Network 层 (Channel 路由)                                  │
│  - subscribe(conn, channelId) - 订阅 channel                │
│  - publish(channelId, msg) - 发送到 channel 订阅者          │
│  - unsubscribe(conn, channelId) - 取消订阅                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  AgentX 层 (集成协调)                                       │
│  - 连接 Queue 和 Network                                    │
│  - 处理客户端协议（subscribe/ack）                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. 数据模型

**Queue 存储**（共享）：

```sql
CREATE TABLE queue_entries (
  cursor TEXT PRIMARY KEY,
  topic TEXT NOT NULL,           -- channelId
  event TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_topic_cursor ON queue_entries(topic, cursor);
```

**订阅追踪**（每连接独立）：

```sql
CREATE TABLE queue_subscriptions (
  connectionId TEXT NOT NULL,
  topic TEXT NOT NULL,           -- 订阅的 channelId
  cursor TEXT,                   -- 当前消费位置
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY (connectionId, topic)
);

CREATE INDEX idx_topic_cursor ON queue_subscriptions(topic, cursor);
```

### 3. EventContext 扩展

```typescript
export interface EventContext {
  channelId?: string; // ← 新增：事件发送的 channel
  containerId?: string;
  imageId?: string;
  agentId?: string;
  sessionId?: string;
  turnId?: string;
  correlationId?: string;
}
```

**channelId 语义**：

- 单聊：`channelId = sessionId`
- 群聊（未来）：`channelId = groupId`
- 系统：`channelId = "system"`

### 4. Network Channel API（需新增）

```typescript
interface ChannelServer {
  // 原有
  broadcast(message: string): void;
  onConnection(handler): Unsubscribe;

  // ← 新增 Channel 能力
  subscribe(connection: ChannelConnection, channelId: string): void;
  publish(channelId: string, message: string): void;
  unsubscribe(connection: ChannelConnection, channelId: string): void;
}
```

### 5. 完整流程

**写入流程**：

```
Runtime.emit(event)  [context.channelId = sessionId]
    ↓
AgentX: runtime.onAny(event)
    ↓
Queue.append(event.context.channelId, event)  ← 持久化
    ↓
Network.publish(event.context.channelId, event)  ← 发给订阅者
```

**订阅流程**：

```
Client → subscribe(channelId, afterCursor?)
    ↓
Network.subscribe(conn, channelId)
    ↓
Queue.trackSubscription(connId, channelId, cursor)
    ↓
Queue.read(channelId, afterCursor) → 发送历史
    ↓
Queue.subscribe(channelId, handler) → 订阅实时
```

**ACK 流程**：

```
Client → ack(channelId, cursor)
    ↓
Queue.ack(connId, channelId, cursor)
    ↓
UPDATE queue_subscriptions SET cursor = ? WHERE connectionId = ? AND topic = ?
```

**清理流程**：

```
定期执行 cleanup()
    ↓
SELECT MIN(cursor) FROM queue_subscriptions WHERE topic = ?
    ↓
DELETE FROM queue_entries WHERE topic = ? AND cursor < MIN(cursor)
```

---

## 待解决问题（Code Review 模式）

### 问题 1：Topic vs ChannelId 命名（讨论中）

**当前混淆点**：

- Queue 用 `topic`
- Network 用 `channelId`
- Event 用 `context.sessionId`

**Architect 提议**：

- EventContext 增加 `channelId` 和 `topicId` 字段
- channelId：Network 层概念
- topicId：业务概念

**待明确**：

1. channelId 和 topicId 的具体语义
2. 一个 text_delta 事件的 channelId 和 topicId 分别是什么？
3. 它们和 sessionId/agentId 的关系？

### 问题 2：ChannelId 由谁设置？

**选项**：

- Runtime 设置（emit 时计算）
- AgentX 设置（收到 request 时注入）
- 客户端设置（subscribe 时指定）

**待明确**：channelId 应该在哪一层生成和设置？

### 问题 3：ConnectionId 重连追踪

**场景**：

```
conn-001 消费到 cursor-5 → 断开
重连 → conn-002（新 ID）→ 如何恢复 cursor-5？
```

**方案**：

- 客户端 localStorage 保存 cursor
- 服务端保留订阅记录（TTL？）

**待明确**：

1. 订阅记录保留多久？
2. 僵尸连接（永不 ACK）如何处理？

### 问题 4：清理的并发安全

**问题**：

- 计算 MIN(cursor) 时，新连接正在 subscribe
- 需要事务保护吗？
- 清理频率和性能影响？

**待明确**：清理的触发时机和并发控制

---

## 下一步计划

### 阶段 1：明确架构细节

- [ ] 确定 channelId/topicId 语义
- [ ] 确定 channelId 设置位置
- [ ] 设计订阅记录生命周期

### 阶段 2：扩展 Queue（MQ 能力）

- [ ] 增加 `queue_subscriptions` 表
- [ ] 修改 `ack(connId, topic, cursor)`
- [ ] 实现基于 MIN cursor 的清理

### 阶段 3：扩展 Network（Channel 能力）

- [ ] 增加 `subscribe/publish/unsubscribe` API
- [ ] 维护 channel 订阅关系

### 阶段 4：修改 EventContext

- [ ] 增加 `channelId` 字段
- [ ] Runtime 层设置 channelId

### 阶段 5：集成测试

- [ ] 多客户端同时订阅测试
- [ ] 断线恢复测试
- [ ] 清理策略测试

---

## 参考资料

**嵌入式 MQ 实现**：

- [goqite](https://github.com/maragudk/goqite) - Go, 仿 AWS SQS
- [litequeue](https://github.com/litements/litequeue) - Python
- [liteq](https://github.com/r-lib/liteq) - R, 消费者崩溃检测
- [HN 讨论：SQLite of Queues](https://news.ycombinator.com/item?id=41072631)

**结论**：市面无轻量 + WebSocket 消费的 MQ，需自己实现。
