# DevOps 操作指南

AgentX 的日常开发、调试、发版流程。

## 分支策略

```
main   ← 正式发布（npm latest tag）
dev    ← 开发快照（npm dev tag）
```

- `main`: 稳定版本，通过 Version PR 合并后自动发布到 npm `latest`
- `dev`: 每次 push 自动发布 snapshot 到 npm `dev` tag

## Dev 渠道发版（日常开发）

### 1. 确保有 changeset 文件

```bash
# 检查是否有 changeset
ls .changeset/*.md | grep -v README

# 没有的话创建一个
cat > .changeset/my-change.md << 'EOF'
---
"@agentxjs/core": patch
"@agentxjs/mono-driver": patch
"agentxjs": patch
---

feat: 描述你的改动
EOF
```

changeset 文件在 dev 分支上会被反复使用（不会被消费），直到合并到 main。

### 2. 提交并推送到 dev

```bash
git add -A
git commit -m "feat: 你的改动描述"
git push origin dev
```

### 3. CI 自动发版

push 到 dev 后，`.github/workflows/changesets-dev.yml` 自动：
1. `changeset version --snapshot dev` — 生成 `2.8.1-dev-20260316...` 版本号
2. 替换 `workspace:*` 为实际版本号
3. `bun run build` — 构建所有包
4. `changeset publish --tag dev` — 发布到 npm dev tag

### 4. 监控 CI

```bash
# 看最新一次 CI 状态
gh run list --limit 1

# 实时监控
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```

### 5. 验证发布

```bash
# 查看所有包的 dev 版本
for pkg in agentxjs @agentxjs/core @agentxjs/mono-driver @agentxjs/node-platform; do
  echo "$pkg: $(npm view $pkg dist-tags 2>/dev/null)"
done
```

### 6. 消费者安装

```bash
bun add agentxjs@dev @agentxjs/core@dev @agentxjs/mono-driver@dev @agentxjs/node-platform@dev
```

## 快速修复流程（Hotfix）

当前端报 bug 需要紧急修复：

```bash
# 1. 定位问题（加日志、看错误）
# 2. 修复代码
# 3. 跑测试
bun test packages/core/tests/ packages/agentx/tests/

# 4. 构建确认
bun run build --force

# 5. 提交推送（自动发版）
git add -A && git commit -m "fix: 问题描述" && git push

# 6. 监控 CI
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

# 7. 通知消费者升级
npm view agentxjs dist-tags
```

整个流程 2-3 分钟完成。

## 本地 Debug Server

用最新源码启一个 AgentX WebSocket server，供前端连接调试：

```bash
# 启动 server（使用已有的 LLM provider 配置）
bun run scripts/debug-server.ts

# 输出：
# AgentX server running on ws://localhost:5200
```

前端连接 `ws://localhost:5200` 即可。server 使用 `~/.deepractice/agentx/` 数据目录。

### 配合前端调试

```bash
# Terminal 1: AgentX debug server
bun run scripts/debug-server.ts > /tmp/agentx-debug.log 2>&1 &

# Terminal 2: 前端 dev server（以 monogent 为例）
cd /path/to/monogent && bun run next dev -p 5500

# Terminal 3: 看 server 日志
tail -f /tmp/agentx-debug.log
```

### 日志输出

server 会输出关键信息：
- `Initializing MonoDriver { model, baseUrl, provider }` — 确认用了哪个 LLM
- `[MediaResolver] Input/Resolved parts` — 文件处理过程
- `Client connected { totalConnections }` — WebSocket 连接状态

## 集成测试

### 多模型文件上传测试

```bash
bun test packages/mono-driver/tests/multi-model-media.test.ts
```

测试 8 个模型 × 4 种文件类型 = 32 个组合。需要 Ark API key（在 `.env.local` 配置）。

### 性能测试

```bash
# 基准 vs RoleX context 对比
bun test packages/mono-driver/tests/perf-sean-role.test.ts
```

### 单元测试

```bash
# 全部
bun test packages/core/tests/ packages/agentx/tests/

# Media Resolver
bun test packages/core/tests/media/

# Engine flush
bun test packages/core/tests/engine/

# Presentation
bun test packages/agentx/tests/presentation-*.test.ts
```

## 环境变量

```bash
# .env.local（项目根目录，不提交到 git）
DEEPRACTICE_API_KEY=your-key
DEEPRACTICE_BASE_URL=https://your-proxy/v1
DEEPRACTICE_MODEL=claude-haiku-4-5-20251001
```

devtools 的 `env` 模块会自动加载 `.env` 和 `.env.local`。

## Pre-push Hook

lefthook 的 pre-push hook 会跑 `bun biome check .`。有已知的 warning（不影响 push），但 error 会阻止 push。

```bash
# 修复 lint 错误
bun run check:fix

# 如果是已有的无关错误，确认后可以跳过（谨慎使用）
git push --no-verify
```

## Changeset 配置

```json
// .changeset/config.json
{
  "fixed": [["agentxjs", "@agentxjs/core", "@agentxjs/mono-driver", ...]],
  "snapshot": { "useCalculatedVersion": true }
}
```

- `fixed`: 这些包版本号同步
- `useCalculatedVersion`: dev snapshot 用实际版本号（如 `2.8.1-dev-xxx`）而不是 `0.0.0-dev-xxx`

## 常见问题

### CI 失败：lockfile had changes

```bash
bun install  # 更新 lockfile
git add bun.lock && git commit -m "chore: update lockfile" && git push
```

### CI 失败：find apps/ no such file

apps/ 目录已删除但 CI workflow 还在引用。修改 `.github/workflows/changesets*.yml` 里的 `find` 和 `grep` 命令。

### push 被 pre-push hook 拒绝

```bash
bun run check:fix  # 自动修复
# 如果是测试文件的 unused import 等无关错误，biome 会自动修
```

### dev 版本号是 0.0.0

检查 `.changeset/config.json` 里 `snapshot.useCalculatedVersion` 是否为 `true`。

### 前端报 Agent not found

server 重启后内存态的 agent 实例丢失。确保前端用 `imageId`（持久化的）而不是 `instanceId`（临时的）。
