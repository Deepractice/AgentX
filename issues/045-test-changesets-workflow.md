# Issue #045: Test Changesets Workflow

**Status**: Pending
**Priority**: High
**Created**: 2025-12-29
**Assignee**: TBD

---

## 目标

验证新的 `changesets/action` 自动发布流程是否正常工作。

---

## 背景

我们已经从手动发布流程迁移到 `changesets/action`：

**旧流程（已删除）：**

- `version.yml` - 手动创建 release PR
- `release.yml` - 创建 GitHub release
- `publish.yml` - 发布 npm + Docker

**新流程：**

- `changesets.yml` - 自动创建 Version PR + 发布 npm + 创建 release
- `post.yml` - release 后构建 Docker

---

## 测试步骤

### 第一步：创建功能分支和 Changeset

```bash
# 1. 切到 main，拉取最新代码
git checkout main
git pull

# 2. 创建功能分支
git checkout -b feat/test-changesets

# 3. 做一个小改动（比如更新 README）
echo "Test changesets workflow" >> README.md

# 4. 创建 changeset
bunx changeset
# 选择要发布的包（比如选 @agentxjs/portagent）
# 选择版本类型（patch）
# 输入描述："Test changesets workflow"

# 5. 提交并推送
git add .
git commit -m "chore: test changesets workflow"
git push -u origin feat/test-changesets
```

### 第二步：创建 PR 到 Main

```bash
gh pr create --title "chore: test changesets workflow" \
  --body "Testing the new changesets/action workflow" \
  --base main \
  --head feat/test-changesets
```

**预期：**

- CI workflow 运行（lint, typecheck, build）
- 不会触发 changesets workflow（因为还没合并到 main）

### 第三步：合并 PR 到 Main

在 GitHub 上合并 PR。

**预期：**

- `changesets.yml` 被触发
- changesets/action 检测到新的 changeset
- 自动创建 "Version Packages" PR，内容包括：
  - 更新所有包的版本号（因为 fixed 模式，所有包一起升版本）
  - 生成/更新 CHANGELOG.md
  - 删除已消费的 changeset 文件

### 第四步：Review 并合并 Version PR

检查自动创建的 Version PR：

**检查内容：**

1. 所有包的 `package.json` 版本号是否正确升级
2. CHANGELOG.md 是否正确生成
3. changeset 文件是否被删除

合并 Version PR。

**预期：**

- changesets/action 自动发布所有包到 npm
- 自动创建 GitHub release (tag: v1.5.2)
- `post.yml` 被 release 事件触发，构建 Docker 镜像

### 第五步：验证发布结果

```bash
# 1. 检查 npm 发布
npm view @agentxjs/persistence@1.5.2
npm view @agentxjs/portagent@1.5.2

# 2. 检查 GitHub release
gh release view v1.5.2

# 3. 检查 Docker 镜像
docker pull deepracticexs/portagent:1.5.2
docker pull deepracticexs/portagent:latest
```

---

## 已知问题

### @agentxjs/persistence 首次发布失败

**错误：**

```
E404 Not Found - PUT https://registry.npmjs.org/@agentxjs%2fpersistence - Not found
```

**原因：**
新包 `@agentxjs/persistence` 之前从未发布过，需要首次发布时有正确的 npm token 权限。

**解决方案：**

1. 检查 `NPM_TOKEN` secret 是否有 publish 权限
2. 如果是 scoped package (`@agentxjs/*`)，确保 package.json 有 `"publishConfig": { "access": "public" }`

### Version 已存在

如果看到：

```
warn @agentxjs/portagent is not being published because version 1.5.1 is already published
```

说明 changeset 没有触发版本升级。需要检查：

1. changeset 文件是否存在于 main 分支
2. changeset 是否被之前的发布消费掉了

---

## 成功标准

- ✅ changesets/action 自动创建 Version PR
- ✅ Version PR 内容正确（版本号、CHANGELOG）
- ✅ 合并 Version PR 后自动发布到 npm
- ✅ 自动创建 GitHub release
- ✅ Docker 镜像自动构建并推送
- ✅ `@agentxjs/persistence` 首次发布成功

---

## 回滚方案

如果测试失败需要回滚：

```bash
# 1. 删除 Git tag（如果已创建）
git tag -d v1.5.2
git push origin :refs/tags/v1.5.2

# 2. 删除 GitHub release（如果已创建）
gh release delete v1.5.2 --yes

# 3. Unpublish npm 包（24小时内可以）
npm unpublish @agentxjs/persistence@1.5.2
# 其他包如果需要...

# 4. 恢复 changeset 文件
# 从 Version PR 的 commit message 里找到备份的 changeset 内容
```

---

## 注意事项

1. **不要在 main 分支直接提交** - 所有改动都应该通过 PR
2. **Changeset 应该在功能分支创建** - 不要在 main 创建
3. **合并前检查 CI** - 确保所有检查通过
4. **Version PR 仔细 review** - 确认版本号和 CHANGELOG 正确

---

## 相关文件

- `.github/workflows/changesets.yml` - 主 workflow
- `.github/workflows/post.yml` - Docker 构建
- `.changeset/config.json` - Changesets 配置
- `package.json` - version/release scripts

---

## 参考

- [changesets/action](https://github.com/changesets/action)
- [changesets 文档](https://github.com/changesets/changesets)
