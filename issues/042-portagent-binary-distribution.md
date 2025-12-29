# Issue #042: Portagent Binary Distribution for Node.js Compatibility

**Status**: In Progress
**Priority**: High
**Created**: 2025-12-28
**Context**: Node.js users cannot run portagent due to Bun-specific APIs
**Resolved**: #043 (Persistence Package Extraction) - Completed

---

## Problem Description

When users run `npx @agentxjs/portagent`, they get an error because the package uses Bun-specific APIs that Node.js doesn't support:

```
Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'bun:'
```

**Root Cause**:

- `bun:sqlite` - Bun's built-in SQLite binding
- `Bun.password.hash/verify` - Bun's password hashing API

These are Bun runtime exclusive and have no Node.js equivalent.

---

## Solution: Binary Distribution

Use `bun build --compile` to create standalone binaries that bundle the Bun runtime. Users don't need to install Bun or Node.js - they just run the binary.

### Package Structure

```
npm packages:
├── @agentxjs/portagent                 # Main package (JS wrapper)
├── @agentxjs/portagent-darwin-arm64    # macOS Apple Silicon binary
├── @agentxjs/portagent-darwin-x64      # macOS Intel binary
├── @agentxjs/portagent-linux-x64       # Linux x64 binary
├── @agentxjs/portagent-linux-arm64     # Linux ARM64 binary
└── @agentxjs/portagent-windows-x64     # Windows x64 binary
```

### User Experience

```bash
# Just works - npm downloads correct binary for user's platform
npx @agentxjs/portagent --port 3000

# Or global install
npm i -g @agentxjs/portagent
portagent --port 3000
```

---

## Implementation Design

### 1. Main Package `@agentxjs/portagent`

**package.json:**

```json
{
  "name": "@agentxjs/portagent",
  "version": "1.6.0",
  "bin": {
    "portagent": "./bin/portagent.js"
  },
  "optionalDependencies": {
    "@agentxjs/portagent-darwin-arm64": "1.6.0",
    "@agentxjs/portagent-darwin-x64": "1.6.0",
    "@agentxjs/portagent-linux-x64": "1.6.0",
    "@agentxjs/portagent-linux-arm64": "1.6.0",
    "@agentxjs/portagent-windows-x64": "1.6.0"
  }
}
```

**bin/portagent.js:**

```javascript
#!/usr/bin/env node
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PLATFORMS = {
  "darwin-arm64": "@agentxjs/portagent-darwin-arm64",
  "darwin-x64": "@agentxjs/portagent-darwin-x64",
  "linux-x64": "@agentxjs/portagent-linux-x64",
  "linux-arm64": "@agentxjs/portagent-linux-arm64",
  "win32-x64": "@agentxjs/portagent-windows-x64",
};

const platformKey = `${process.platform}-${process.arch}`;
const pkgName = PLATFORMS[platformKey];

if (!pkgName) {
  console.error(`Unsupported platform: ${platformKey}`);
  console.error(`Supported: ${Object.keys(PLATFORMS).join(", ")}`);
  process.exit(1);
}

try {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve(`${pkgName}/package.json`);
  const binPath = join(dirname(pkgPath), "bin", "portagent");

  execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
} catch (e) {
  console.error(`Failed to run portagent binary: ${e.message}`);
  console.error(`\nTry reinstalling: npm install -g @agentxjs/portagent`);
  process.exit(1);
}
```

### 2. Platform Package `@agentxjs/portagent-darwin-arm64`

**package.json:**

```json
{
  "name": "@agentxjs/portagent-darwin-arm64",
  "version": "1.6.0",
  "os": ["darwin"],
  "cpu": ["arm64"],
  "files": ["bin/portagent"]
}
```

**Directory structure:**

```
portagent-darwin-arm64/
├── package.json
└── bin/
    └── portagent          # Compiled binary (~50-60MB)
```

### 3. Frontend Embedding

Use `bun build --compile --embed` to bundle frontend assets into the binary:

```bash
# Build frontend first
bun run build:client

# Compile with embedded assets
bun build --compile \
  --target bun-darwin-arm64 \
  --embed ./dist/public \
  --minify \
  src/cli/index.ts \
  --outfile ./bin/portagent
```

**Server code modification** (src/server/static.ts):

```typescript
// Detect if running as compiled binary
function isCompiledBinary(): boolean {
  try {
    // Bun.embed only exists in compiled binaries
    return typeof Bun !== "undefined" && "embed" in Bun;
  } catch {
    return false;
  }
}

export function serveEmbeddedStatic(app: Hono) {
  if (isCompiledBinary()) {
    // Serve from embedded assets
    app.get("/*", async (c) => {
      const path = c.req.path === "/" ? "/index.html" : c.req.path;
      try {
        const file = Bun.embed(`./dist/public${path}`);
        const contentType = getContentType(path);
        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        // Fallback to index.html for SPA
        const index = Bun.embed("./dist/public/index.html");
        return c.html(index.text());
      }
    });
  } else {
    // Development: serve from filesystem
    app.use("/*", serveStatic({ root: publicDir }));
  }
}
```

---

## Build Script

**scripts/build-binaries.ts:**

```typescript
import { $ } from "bun";
import { mkdir, cp, writeFile } from "fs/promises";
import { join } from "path";

const VERSION = "1.6.0";
const DIST_DIR = "./dist-binaries";

const TARGETS = [
  { platform: "darwin-arm64", target: "bun-darwin-arm64", ext: "" },
  { platform: "darwin-x64", target: "bun-darwin-x64", ext: "" },
  { platform: "linux-x64", target: "bun-linux-x64", ext: "" },
  { platform: "linux-arm64", target: "bun-linux-arm64", ext: "" },
  { platform: "windows-x64", target: "bun-windows-x64", ext: ".exe" },
];

async function build() {
  console.log("1. Building frontend...");
  await $`bun run build:client`;

  console.log("2. Building binaries...");
  await mkdir(DIST_DIR, { recursive: true });

  for (const { platform, target, ext } of TARGETS) {
    console.log(`   Building ${platform}...`);

    const pkgDir = join(DIST_DIR, `portagent-${platform}`);
    const binDir = join(pkgDir, "bin");
    await mkdir(binDir, { recursive: true });

    // Compile binary with embedded frontend
    await $`bun build --compile \
      --target ${target} \
      --embed ./dist/public \
      --minify \
      src/cli/index.ts \
      --outfile ${join(binDir, `portagent${ext}`)}`;

    // Create package.json
    const [os, cpu] = platform.split("-");
    const pkgJson = {
      name: `@agentxjs/portagent-${platform}`,
      version: VERSION,
      description: `Portagent binary for ${platform}`,
      os: [os === "windows" ? "win32" : os],
      cpu: [cpu],
      files: ["bin"],
      license: "MIT",
      repository: {
        type: "git",
        url: "https://github.com/Deepractice/AgentX.git",
      },
    };
    await writeFile(join(pkgDir, "package.json"), JSON.stringify(pkgJson, null, 2));
  }

  console.log("3. Building main package...");
  // Copy and modify main package for binary distribution
  // ... (main wrapper package setup)

  console.log("Done! Packages ready in", DIST_DIR);
}

build().catch(console.error);
```

---

## CI/CD Workflow

**.github/workflows/release-binaries.yml:**

```yaml
name: Release Binaries

on:
  push:
    tags:
      - "portagent-v*"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - run: bun run scripts/build-binaries.ts

      - name: Publish to npm
        run: |
          cd dist-binaries
          for dir in */; do
            cd "$dir"
            npm publish --access public
            cd ..
          done
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Tasks

- [ ] Create `scripts/build-binaries.ts` build script
- [ ] Modify `src/server/index.ts` to support embedded static files
- [ ] Create main package wrapper with platform detection
- [ ] Test binary compilation for all platforms
- [ ] Set up CI workflow for automated releases
- [ ] Update documentation

---

## Testing Plan

1. **Local build test:**

   ```bash
   bun run scripts/build-binaries.ts
   ./dist-binaries/portagent-darwin-arm64/bin/portagent --help
   ```

2. **npm install simulation:**

   ```bash
   cd dist-binaries/portagent-darwin-arm64
   npm pack
   npm install -g ./agentxjs-portagent-darwin-arm64-1.6.0.tgz
   ```

3. **Cross-platform verification:**
   - Test on macOS (arm64 + x64)
   - Test on Linux (x64)
   - Test on Windows (x64)

---

## Size Estimates

| Component            | Size      |
| -------------------- | --------- |
| Bun runtime          | ~45MB     |
| Server code          | ~2MB      |
| Frontend assets      | ~1MB      |
| **Total per binary** | **~50MB** |

This is comparable to other binary-distributed tools:

- esbuild: ~9MB (Go, minimal runtime)
- Turbo: ~50MB (similar architecture)
- Prisma: ~40MB

---

## References

- [Bun Single-file Executable](https://bun.sh/docs/bundler/executables)
- [esbuild Binary Distribution](https://github.com/evanw/esbuild/blob/main/pkg/npm/esbuild/bin/esbuild)
- [Turbo npm package structure](https://github.com/vercel/turbo/tree/main/packages/turbo)

---

## Blocking Issue

Binary build succeeds, but runtime fails with:

```
Cannot find module 'mysql2/promise'
```

This is because `@agentxjs/runtime` contains all persistence drivers in one switch statement. Even with `--external` flags, Bun's compiled binary still tries to resolve these imports at runtime.

**Solution**: Extract persistence to independent package (#043), with each driver as a separate subpath export. This allows bundlers to only include the drivers actually used.

---

## Related Issues

- #039: Bun migration plan
- #041: Portagent CSS loading issue (resolved by embedding)
- #043: Persistence Package Extraction (must complete first)
