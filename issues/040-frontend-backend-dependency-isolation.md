# Issue 040: Frontend/Backend Dependency Isolation

**Created**: 2025-12-28
**Status**: Open
**Priority**: High
**Category**: Architecture, Build System

---

## Problem

UI 包（`@agentxjs/ui`）在开发工具（Storybook）中会传递性地加载服务器端依赖，导致 Vite 尝试打包它们并失败。

### Error Example

```
Error: Cannot find module 'pg'
Error: Could not resolve "mongodb"
```

### Root Cause

**依赖链污染**：

```
@agentxjs/ui (Frontend)
  └─ devDependencies: @agentxjs/runtime (Backend)
      └─ dependencies: db0
          └─ optional: pg, mongodb, mysql2
              └─ unstorage
                  └─ optional: mongodb
```

即使 UI 包源码从不导入 runtime，Vite/Storybook 在构建预览时会扫描所有依赖，尝试解析这些服务器端包。

---

## Current Workaround (Dirty)

**Method 1**: Hardcode external patterns in Vite config

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      external: [
        "@agentxjs/runtime",
        /^db0\//,
        /^unstorage\//,
        "pg",
        "mongodb",
        "mysql2",
        // ... more hardcoded patterns
      ],
    },
  },
};
```

**Method 2**: Hardcode in Storybook config

```typescript
// .storybook/main.ts
viteFinal: async (config) => {
  config.build.rollupOptions.external = [
    /^@agentxjs\/runtime/,
    /^db0\//,
    // ... duplicated patterns
  ];
};
```

**Why it's dirty**:

- ❌ Hardcoded list of server packages
- ❌ Needs manual updates when dependencies change
- ❌ Duplicated in multiple config files
- ❌ Brittle and error-prone

---

## Proposed Solutions

### Solution A: Separate UI Package (Recommended)

**Split into two packages**:

```
packages/
├─ ui-core/          # Pure UI components (no server deps)
├─ ui-dev-tools/     # Storybook, dev server (can import runtime)
```

**Benefits**:

- ✅ Clean separation of concerns
- ✅ ui-core is guaranteed frontend-only
- ✅ No hardcoded external lists needed

**Drawbacks**:

- ❌ More packages to maintain
- ❌ Storybook stories need to import from ui-core

---

### Solution B: Dev-Only Peerization

**Move runtime to peerDependencies**:

```json
{
  "peerDependencies": {
    "@agentxjs/runtime": "workspace:*"
  },
  "peerDependenciesMeta": {
    "@agentxjs/runtime": {
      "optional": true
    }
  }
}
```

**Benefits**:

- ✅ Minimal changes
- ✅ Signals runtime is not bundled

**Drawbacks**:

- ❌ Still in dependency tree
- ❌ Vite may still try to resolve it

---

### Solution C: Conditional Imports (Best Practice)

**Use dynamic imports in dev tools**:

```typescript
// dev-tools/server/dev-server.ts
const { createAgentX } = await import("@agentxjs/runtime");
```

**Vite config**: Mark as external only for library build

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      external: (id) => {
        // Only external in library build, not dev mode
        if (process.env.STORYBOOK) return false;
        return id === "@agentxjs/runtime" || id.startsWith("@agentxjs/runtime/");
      },
    },
  },
});
```

**Benefits**:

- ✅ No hardcoded lists
- ✅ Works for both Storybook and library build
- ✅ Server deps only loaded when actually needed

**Drawbacks**:

- ❌ Requires env var detection
- ❌ More complex config

---

### Solution D: Vite Plugin (Cleanest)

**Create custom Vite plugin**:

```typescript
// vite-plugin-external-server.ts
export function externalServer() {
  return {
    name: "external-server",
    enforce: "pre",
    resolveId(id) {
      // Auto-detect server-only packages
      if (isServerPackage(id)) {
        return { id, external: true };
      }
    },
  };
}

function isServerPackage(id: string) {
  const serverPatterns = [/^@agentxjs\/runtime/, /^db0\//, /^bun:/, /^node:/];
  return serverPatterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(id) : id === pattern
  );
}
```

**Benefits**:

- ✅ Reusable across projects
- ✅ Centralized logic
- ✅ Auto-detects patterns

**Drawbacks**:

- ❌ Still needs pattern list (but in one place)

---

## Recommended Approach

**Short-term**: Use Solution C (Conditional Imports)

- Less invasive than package split
- Cleaner than hardcoded lists
- Works for current architecture

**Long-term**: Consider Solution A (Separate Packages)

- When UI package is published to npm
- When multiple consumers exist
- Ensures clean frontend-only package

---

## Related Issues

- [Bun Bundler: Tailwind CSS · Issue #12878](https://github.com/oven-sh/bun/issues/12878)
- [Missing Styles When Developing with bun-plugin-tailwind · Issue #19021](https://github.com/tailwindlabs/tailwindcss/issues/19021)

---

## Impact

**Affected**:

- ❌ Storybook development (cannot start)
- ❌ Library builds (if using Vite)
- ❌ Third-party consumers (if they use Vite)

**Not Affected**:

- ✅ Runtime functionality (components work fine)
- ✅ Bun builds (Bun.build handles this correctly)
- ✅ Production apps (if bundled correctly)

---

## Action Items

- [ ] Choose solution approach (A, C, or D)
- [ ] Implement chosen solution
- [ ] Test with Storybook
- [ ] Document in UI package README
- [ ] Add CI check to prevent server deps in UI package

---

## Notes

This is a common issue in monorepos where frontend packages transitively depend on backend packages through dev tooling. The root cause is that bundlers (Vite/Webpack) are designed to resolve ALL dependencies, even optional ones, while Bun.build only bundles what's actually imported.
