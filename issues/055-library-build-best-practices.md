# Issue 055: TypeScript 类库构建最佳实践

## 背景

在发布 agentxjs 到 npm 后，云平台团队在 Next.js/Turbopack 环境下无法正常使用，报错：

```
Module not found: Can't resolve 'node:module'
```

## 根本原因

### 1. 直接导出 TypeScript 源码

```json
// package.json (错误)
"exports": {
  ".": "./src/index.ts"
}
```

这在 Bun 环境下可以工作（Bun 原生支持 TypeScript），但在其他环境（Node.js、Next.js、浏览器）需要编译后的 JS。

### 2. 依赖链包含 Node.js 特有 API

```
agentxjs → @agentxjs/core → commonxjs/logger → node:module (polyfill)
```

commonxjs 的构建配置使用 `target: "node"`，导致 Bun 打包时自动添加了 `node:module` polyfill，而这在浏览器环境不可用。

## 解决方案

### 1. 使用 tsup 构建类库

tsup 是 TypeScript 类库的标准构建工具，基于 esbuild，配置简单：

```typescript
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/index.ts"],  // 自动发现所有入口
  format: ["esm"],
  dts: true,                    // 自动生成 .d.ts
  sourcemap: true,
  clean: true,
  external: ["依赖包名"],
});
```

对于有子路径导出的包，使用对象形式指定入口：

```typescript
entry: {
  index: "src/index.ts",
  "agent/index": "src/agent/index.ts",
  "event/index": "src/event/index.ts",
},
```

### 2. package.json exports 指向 dist/

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./agent": {
      "types": "./dist/agent/index.d.ts",
      "import": "./dist/agent/index.js",
      "default": "./dist/agent/index.js"
    }
  },
  "files": ["dist", "src"],  // 同时发布 dist 和 src，方便查看源码
  "scripts": {
    "build": "tsup"
  }
}
```

### 3. 区分 browser-safe 和 node-only 模块

对于跨平台库（如 commonxjs），需要分别构建：

```typescript
// browser-safe 模块
await Bun.build({
  entrypoints: ["src/logger/index.ts"],
  target: "browser",  // 不会添加 node:module polyfill
});

// node-only 模块
await Bun.build({
  entrypoints: ["src/sqlite/index.ts"],
  target: "node",
});
```

## 最佳实践总结

| 场景 | 构建工具 | 说明 |
|------|---------|------|
| **类库（发布到 npm）** | tsup | 自动处理多入口、dts、external |
| **二进制/CLI 应用** | Bun | 直接运行 .ts，无需构建 |
| **跨平台库** | 分环境构建 | browser-safe 用 `target: browser` |

### 检查清单

- [ ] `exports` 指向 `./dist/` 而非 `./src/`
- [ ] `files` 包含 `["dist", "src"]`
- [ ] 添加 `tsup.config.ts` 配置
- [ ] `build` 脚本使用 `tsup`
- [ ] 依赖声明为 `external` 避免打包进去
- [ ] 加新模块时无需修改构建配置（tsup 自动发现）

## 相关文件

- `packages/*/tsup.config.ts` - 各包的 tsup 配置
- `packages/*/package.json` - exports 配置示例

## 参考

- [tsup 文档](https://tsup.egoist.dev/)
- [Package.json exports](https://nodejs.org/api/packages.html#exports)
