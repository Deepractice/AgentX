# Issue #041: Portagent CSS Not Loading in Vite Dev Mode

**Status**: 🔴 Blocked
**Priority**: High
**Created**: 2025-12-28
**Context**: During Bun migration and Issue #040 (dependency isolation)

---

## Problem Description

Portagent client (Vite dev server) loads CSS but Tailwind utilities are not applied. Page displays unstyled content.

**Symptoms**:

- CSS file loads but contains only ~7 lines of Vite HMR code
- Tailwind directives (`@tailwind base/components/utilities`) not expanded
- Components render without styles
- Production build (`bun run build`) works correctly (14KB CSS generated)

**Environment**:

- Vite: 6.4.1
- Tailwind: 3.4.17
- PostCSS: 8.4.49
- Monorepo with workspace packages

---

## Current Configuration

### Files

**apps/portagent/src/client/input.css**:

```css
/* Import AgentX CSS variables from UI package */
@import "@agentxjs/ui/globals.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

**apps/portagent/vite.config.ts**:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  css: {
    postcss: "./postcss.config.js",
  },
  // ... proxy config
});
```

**apps/portagent/postcss.config.js**:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**apps/portagent/tailwind.config.js**:

```javascript
import agentxPreset from "@agentxjs/ui/tailwind-preset";

export default {
  presets: [agentxPreset],
  content: [
    "./index.html",
    "./src/client/**/*.{ts,tsx}",
    "./node_modules/@agentxjs/ui/dist/**/*.js",
  ],
};
```

---

## Comparison: Working vs Broken

### ✅ Storybook (Working)

**Location**: `dev/storybook/`
**CSS**: Same `@import "@agentxjs/ui/globals.css"` + `@tailwind` directives
**Vite Config**: Almost identical (has `css.postcss` config)
**Result**: All styles load correctly, components display properly

### ❌ Portagent (Broken)

**Location**: `apps/portagent/`
**CSS**: Same content as Storybook
**Vite Config**: Same PostCSS config
**Result**: CSS not processed, only 7 lines of HMR code

### ✅ Production Build (Working)

**Command**: `bun run build`
**Result**: Generates `dist/public/assets/styles.css` (14KB)
**Content**: Contains Tailwind base layer and some utilities
**Issue**: Still has unresolved `@import "@agentxjs/ui/globals.css"` at top

---

## Investigation Results

### Test 1: Simple Tailwind (Without @import)

```bash
# Input: @tailwind directives only (no @import)
npx tailwindcss -i test.css -o output.css
# Result: ✅ Success, 850 lines generated
```

### Test 2: With Package Import

```bash
# Input: @import "@agentxjs/ui/globals.css" + @tailwind directives
npx tailwindcss -i input.css -o output.css
# Result: ❌ Error: Failed to find '@agentxjs/ui/globals.css'
```

**Error Message**:

```
Error: Failed to find '@agentxjs/ui/globals.css'
  in [
    /Users/sean/Deepractice/AgentX/apps/portagent/src/client
  ]
```

### Test 3: Storybook CLI

```bash
cd dev/storybook
npx tailwindcss -i styles.css -o output.css
# Result: ❌ Same error (but Vite dev works!)
```

---

## Root Cause Analysis

**postcss-import Path Resolution Issue**:

1. `@import "@agentxjs/ui/globals.css"` requires resolving package exports
2. postcss-import searches in `basedir` (current file's directory)
3. In monorepo, package may be in workspace root `node_modules`
4. CLI fails to find package, Vite dev sometimes works

**Why Storybook Works**:

- Unknown - same configuration, same @import statement
- Possibly different Vite internal handling?
- Maybe Storybook's Vite plugin has special CSS resolution?

**Why Production Build Works**:

- `build.ts` uses custom Tailwind CLI command
- May have different path resolution
- But still leaves unresolved @import in output

---

## Attempted Solutions

### ❌ Attempt 1: Add Vite Alias

```typescript
resolve: {
  alias: {
    "@agentxjs/ui/globals.css": path.resolve(__dirname, "../../packages/ui/dist/globals.css"),
  },
}
```

**Result**: No change

### ❌ Attempt 2: Configure postcss-import

```javascript
"postcss-import": {
  path: ["node_modules"],
}
```

**Result**: Still can't resolve package imports

### ❌ Attempt 3: Inline CSS Variables

Copy entire `globals.css` content into `input.css`
**Result**: Works but violates DRY principle

---

## Questions for Investigation

1. **Why does Storybook Vite work but Portagent doesn't?**
   - Same configuration
   - Same @import statement
   - Different behavior

2. **Is this a Vite + Monorepo + PostCSS known issue?**
   - Search results show similar problems
   - But no clear solution for workspace packages

3. **Should we use a different approach?**
   - Official Tailwind docs don't cover @import from packages
   - Is `@import "@agentxjs/ui/globals.css"` a non-standard pattern?

4. **What's the recommended way to share CSS variables?**
   - Distribute compiled CSS? (agentx-ui.css)
   - Use Tailwind preset only? (JS config, no CSS import)
   - Inline CSS variables in each app?

---

## Workarounds Available

### Option A: Use Precompiled CSS (Immediate Fix)

```typescript
// main.tsx
import "@agentxjs/ui/dist/agentx-ui.css"; // 34KB, includes all utilities
```

- ✅ Works immediately
- ❌ Can't customize theme
- ❌ Larger bundle

### Option B: Inline CSS Variables (DRY Violation)

Copy all variables from `globals.css` to `input.css`

- ✅ Works
- ❌ Duplicated code
- ❌ Manual sync required

### Option C: Debug Why Storybook Works

Compare byte-by-byte differences between Storybook and Portagent setup

---

## Related Issues

- #040: Frontend/backend dependency isolation (parent issue)
- #039: Bun migration plan

---

## Environment

```bash
AgentX/
├── packages/ui/
│   ├── dist/globals.css (CSS variables only)
│   ├── dist/agentx-ui.css (34KB precompiled)
│   └── package.json (exports: "./globals.css": "./dist/globals.css")
├── dev/storybook/
│   ├── styles.css (@import "@agentxjs/ui/globals.css" + @tailwind) ✅ Works
│   └── vite.config.ts (css.postcss configured)
└── apps/portagent/
    ├── src/client/input.css (@import "@agentxjs/ui/globals.css" + @tailwind) ❌ Broken
    └── vite.config.ts (css.postcss configured)
```

**Package Versions**:

- tailwindcss: 3.4.17
- postcss: 8.4.49
- postcss-import: 16.1.1
- vite: 6.4.1

---

## Expected Behavior

`@import "@agentxjs/ui/globals.css"` should resolve to `node_modules/@agentxjs/ui/dist/globals.css` and inline the CSS variables, allowing Tailwind to generate utilities based on those variables.

**Actual Behavior**: Import fails silently in dev mode, resulting in no CSS output.

---

## Next Steps

1. [ ] Compare Storybook and Portagent's actual Vite runtime behavior
2. [ ] Test if Vite resolve.conditions affects CSS imports
3. [ ] Check if Storybook's @storybook/react-vite does special CSS handling
4. [ ] Consult Vite/Tailwind communities for monorepo CSS import patterns
5. [ ] Consider refactoring globals.css export strategy

---

## References

- [Tailwind Component Library Discussion #13960](https://github.com/tailwindlabs/tailwindcss/discussions/13960)
- [Vite Monorepo CSS Issues #12305](https://github.com/vitejs/vite/discussions/12305)
- [PostCSS Import npm](https://www.npmjs.com/package/postcss-import)
- [Tailwind 3.x Vite Guide](https://v3.tailwindcss.com/docs/guides/vite)
