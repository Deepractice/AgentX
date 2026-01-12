# Queue + MQ Architecture Design

**Issue**: #205 - Add @agentxjs/queue package for reliable event delivery
**Branch**: `feat/queue-package`
**Date**: 2026-01-12
**Status**: Phase 2 完成，待合并

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

---

## Phase 2: 架构重构（已完成）

### 核心设计决策

| 决策            | 结论                                     |
| --------------- | ---------------------------------------- |
| Network Channel | **删除** - Queue 负责所有路由            |
| Queue 定位      | **完整 MQ** - 持久化 + 订阅 + ACK + 清理 |
| 消费者标识      | **clientId 模式** - baseClientId + tabId |
| 清理策略        | **双 TTL** - Consumer 24h + Message 48h  |
| 客户端体验      | **透明** - 自动订阅、自动 ACK            |

### 实现内容

#### 1. Network 层（削弱）

- ✅ 删除 `subscribe/publish/unsubscribe` 方法
- ✅ 删除 `channels: Map` 数据结构
- ✅ 保留基础传输能力（连接、心跳、send/receive）

#### 2. Queue 层（增强）

- ✅ 添加 `MessageSender` 通用接口（不依赖 Network 类型）
- ✅ 添加 `handleConnection(sender)` 方法封装协议处理
- ✅ 更新 `createConsumer(consumerId, topic)` API（接受 clientId）
- ✅ 实现 `cleanup()` 双 TTL 策略
  - Consumer TTL: 24h 无活动删除
  - Message TTL: 48h 强制删除
  - MIN(cursor) 清理已消费消息

#### 3. Types 层

- ✅ `QueueSubscribeRequest` 添加 `clientId` 字段
- ✅ `QueueAckRequest` 添加 `clientId` 字段
- ✅ `QueueUnsubscribeRequest` 添加 `clientId` 字段
- ✅ `QueueOptions` 添加 `consumerTtlMs`、`messageTtlMs`
- ✅ 添加 `MessageSender` 接口（Queue 独立于 Network）
- ✅ 添加 `Unsubscribe` 类型（Queue 自己定义）

#### 4. AgentX Server（简化）

- ✅ 从 ~265 行简化到 ~170 行
- ✅ 删除手动协议处理代码
- ✅ 使用 `eventQueue.handleConnection(connection)` 一行搞定

#### 5. AgentX Client（自动化）

- ✅ 生成 clientId（baseClientId + tabId）
- ✅ 自动订阅：session_get/session_create 成功后
- ✅ 自动 ACK：收到 queue_entry 立即 ACK
- ✅ cursor 持久化：localStorage（浏览器）/ 内存（Node.js）
- ✅ 断线重连：自动重新订阅

### 验证

```
✅ typecheck: 19 successful
✅ queue tests: 9 pass (包含重连测试)
```

### 架构图（最终版）

```
┌─────────────────────────────────────────────────────────────┐
│  Runtime 层                                                 │
│  - 产生事件                                                 │
│  - event.context.sessionId 作为 topic                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Queue 层 (完整 MQ)                                         │
│  - 持久化事件（按 topic 分区）                              │
│  - handleConnection(sender) 处理协议                        │
│  - 追踪消费者（clientId → cursor）                          │
│  - ACK 管理（每消费者独立）                                 │
│  - 双 TTL 清理（Consumer 24h + Message 48h）                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Network 层 (纯传输)                                        │
│  - WebSocket 连接管理                                       │
│  - 心跳检测                                                 │
│  - send/onMessage/onClose                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  AgentX Client (透明处理)                                   │
│  - 自动订阅（session 操作后）                               │
│  - 自动 ACK（收到即确认）                                   │
│  - 断线重连（恢复订阅 + cursor）                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 未来工作（已延后）

以下问题在本次迭代中暂不解决：

| 问题         | 说明                        | 优先级 |
| ------------ | --------------------------- | ------ |
| 错误处理协议 | 添加 `queue_error` 消息类型 | 低     |
| 消息顺序保证 | 历史回放和实时订阅衔接      | 中     |
| 背压处理     | 客户端处理不过来时的策略    | 低     |
| 独立 MQ 项目 | 拆分为独立的 LiteMQ 项目    | 中     |

---

## 独立 MQ 项目规划

**市场调研结论**：市面无轻量 + WebSocket 消费 + 多消费者独立 cursor 的 MQ。

**LiteMQ 定位**：

- 嵌入式：SQLite 后端，零依赖部署
- 多消费者：每个消费者独立 cursor
- 可靠投递：持久化 + ACK + 断线恢复
- WebSocket 原生：内置协议支持
- TypeScript/Bun 优先

**计划**：先在 AgentX 中验证完善，之后拆分为独立项目。

---

## 参考资料

**嵌入式 MQ 实现**：

- [goqite](https://github.com/maragudk/goqite) - Go, 仿 AWS SQS
- [litequeue](https://github.com/litements/litequeue) - Python
- [liteq](https://github.com/r-lib/liteq) - R, 消费者崩溃检测
- [liteque](https://github.com/karakeep-app/liteque) - TypeScript, Job Queue
- [HN 讨论：SQLite of Queues](https://news.ycombinator.com/item?id=41072631)
