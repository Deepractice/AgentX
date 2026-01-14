# 050 - Integration Tests and Real API Event Capture

**状态**: 待实施
**优先级**: High
**创建时间**: 2026-01-13
**标签**: `testing`, `integration`, `queue`
**依赖**: #046 (Queue MQ Architecture)

---

## 问题背景

当前 BDD 测试状态：

- ✅ **Layer 1 基础测试**: 29/29 (100%) - 单元级别通过
- ✅ **Mock 测试**: 4/4 (100%) - MockEnvironment 工作正常
- ⚠️ **Reliability 测试**: 13/27 (48%) - 只有模拟状态，无真实验证
- ❌ **Integration 测试**: 0/2 - 已创建但未运行

**核心问题**：
虽然 Queue MQ 架构已实现，但**核心场景未端到端验证**：

1. 断线期间消息不丢失（WebSocket 断开时丢失率 35.7% → 0%）
2. 重连后消息恢复
3. 多消费者独立 cursor

**现状**：

- @reliability 测试都是模拟（`server sends message` 只设置变量）
- 没有真实的 API streaming + WebSocket 断线测试
- Mock scenarios 是猜的，不是基于真实 API 行为

---

## 目标

### 1. 运行 Integration 测试验证核心场景

**已创建**：

- `features/integration/real-api.feature` (2 scenarios)
- `steps/integration.steps.ts`

**需要做**：

- 修复 step 定义冲突（integration.steps.ts vs conversation.steps.ts）
- 调试 cucumber tags（@integration 被默认排除）
- 运行真实 API 测试

**验证目标**：

- ✅ 真实 Claude API 消息流完整性
- ✅ 断线期间消息不丢失
- ✅ 重连后 Queue 恢复所有错过事件

### 2. 捕获真实 API 事件流

**场景**：

```gherkin
@capture-events
Scenario: Capture real API event flow
  Given event recorder is enabled
  And I am subscribed to all events

  When I send message "Say hello in 5 words" to image "test-chat"

  Then I should receive "message_start" event
  And I should receive "text_delta" events
  And I should receive "message_stop" event
  And event flow should be recorded to file
```

**输出**：`bdd/mock/captured-scenario.json`

**格式**：

```json
{
  "name": "Captured from real API",
  "timestamp": "2026-01-13T16:45:00.000Z",
  "events": [
    { "type": "message_start", "category": "stream", "data": {...} },
    { "type": "text_delta", "category": "stream", "data": { "text": "Hello" } },
    { "type": "text_delta", "category": "stream", "data": { "text": " there" } },
    { "type": "message_stop", "category": "stream", "data": {...} },
    { "type": "assistant_message", "category": "message", "data": {...} }
  ]
}
```

### 3. 基于真实事件改进 Mock Scenarios

**步骤**：

1. 分析 `captured-scenario.json`
2. 提取真实的事件类型、顺序、数据结构
3. 更新 `bdd/mock/scenarios.ts`：
   - 修正事件类型（可能缺少某些）
   - 修正 data 结构（真实字段）
   - 添加真实的事件顺序

**改进点**：

- message_start 的真实 data 字段
- text_delta 的真实分块方式
- tool_call 的真实格式
- message_stop 的 stopReason

### 4. 用改进的 Mock 重写 Reliability 测试

**当前假测试**：

```gherkin
# 假的 - 只设置变量
When server sends message "test" to image "chat"
Then I should receive message "test"
```

**改为真测试**：

```gherkin
# 真的 - 使用 Mock 但验证真实流程
When client sends message "Test" to image "chat"  # ← 触发 MockEnvironment
Then client should receive text_delta events      # ← 验证真实事件流
And events go through Agent → Queue → Client      # ← 端到端
```

**可重写的场景**：

- Messages delivered in order
- Disconnect during streaming recovers all
- Multiple clients receive independently
- Long stream (100 events)

---

## 实施计划

### Phase 1: 修复 Integration 测试（必须）

- [ ] **修复 step 冲突**
  - 文件：`bdd/steps/integration.steps.ts`
  - 移除重复的 `I should receive "X" event` 定义
  - 复用 `conversation.steps.ts` 的步骤

- [ ] **调试 cucumber 配置**
  - 文件：`bdd/cucumber.js`
  - 确保 @integration 可以运行
  - 或者用 `--tags "@integration"` 覆盖

- [ ] **运行第一个场景**

  ```bash
  MOCK_LLM=false bun test:bdd run features/integration/real-api.feature:12
  ```

  - 验证真实 API 调用
  - 验证事件订阅
  - 验证事件记录

### Phase 2: 事件捕获和分析（推荐）

- [ ] **成功运行 @capture-events**
  - 生成 `bdd/mock/captured-scenario.json`
  - 分析事件类型和顺序

- [ ] **对比 Mock vs Real**
  - 检查 Mock scenarios 的准确性
  - 补充缺失的事件类型
  - 修正 data 字段结构

- [ ] **更新 Mock scenarios**
  - 基于真实数据
  - 添加更多变体（thinking, tool_call, error）

### Phase 3: 真实断线测试（核心）

- [ ] **运行 @disconnect-recovery**

  ```gherkin
  Scenario: Disconnect during real API streaming recovers messages
    Given client connected to real API server
    When client sends "Count from 1 to 10"
    And client receives 3 text_delta
    And client DISCONNECTS (dispose)
    And wait 3 seconds for API to finish
    And client RECONNECTS
    Then client receives ALL remaining text_delta
    And message contains "10"
  ```

- [ ] **验证核心功能**
  - Queue 持久化了断线期间的事件 ✅
  - 重连后客户端恢复消费 ✅
  - 无消息丢失 ✅

### Phase 4: 用改进的 Mock 重写（可选）

- [ ] **创建基于真实流的 Mock 场景**
  - 从 captured-scenario.json 生成

- [ ] **重写 @reliability 测试**
  - 使用 Mock 但验证真实流程
  - 快速、可预测、准确

- [ ] **标记旧测试 @pending**
  - 服务器重启场景
  - 清理验证场景
  - 复杂的边界情况

---

## 期望结果

### Phase 1-3 完成后

```
Integration Tests:
  ✅ @capture-events: 1/1 pass (事件已抓取)
  ✅ @disconnect-recovery: 1/1 pass (核心场景验证)

核心验证：
  ✅ WebSocket 断线期间消息不丢失（0% loss vs 35.7% before）
  ✅ 重连后 Queue 恢复所有错过事件
  ✅ 多消费者独立 cursor

Mock Scenarios:
  ✅ 基于真实 API 事件流
  ✅ 准确的事件类型和顺序
  ✅ 真实的 data 字段结构
```

### Phase 4 完成后（可选）

```
Reliability Tests (with improved Mock):
  ✅ 50+/60 scenarios pass (90%+)
  ✅ 快速执行（~5-10 秒）
  ✅ 无需 API key 日常运行
```

---

## 当前状态

### 已完成

- [x] Queue MQ 架构实现
- [x] BDD 测试框架（test-server + test-manager）
- [x] MockEnvironment 实现
- [x] Layer 1 测试（29/29 pass）
- [x] 创建 integration test 文件

### 待完成（本 issue）

- [ ] 修复 integration tests
- [ ] 运行 @capture-events
- [ ] 运行 @disconnect-recovery
- [ ] 改进 Mock scenarios
- [ ] 重写 reliability tests（可选）

---

## 相关 Issue

- #046 - Queue MQ Architecture（Phase 2 完成，等待 Phase 3 验证）
- #048 - Mock Environment for BDD（已完成）
- #049 - Broadcast Refactoring（已完成）

---

## 优先级说明

**High Priority**（必须）：

- Phase 1-3：验证核心场景真实可工作

**Medium Priority**（推荐）：

- Phase 4：用改进的 Mock 提升测试覆盖率

**当前可合并**：
即使不完成本 issue，当前分支（19 commits, 42/56 pass）已经是完整的架构改进，可以先合并。
