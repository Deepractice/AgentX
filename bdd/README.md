# AgentX BDD Tests

BDD tests for `agentxjs` and `@agentxjs/server`.

## Quick Start

```bash
# Run all tests
bun run test

# Run devtools tests only
bun run test:devtools
```

## VCR Mode (Recommended for Development)

Use `@agentxjs/devtools` VCR mode for efficient test development:

**First run** → Calls real API, records response to `fixtures/`
**Subsequent runs** → Plays back from fixtures, no API calls needed

### Usage

```typescript
import { createDevtools } from "@agentxjs/devtools";

const devtools = createDevtools({
  fixturesDir: "./fixtures",
  apiKey: process.env.DEEPRACTICE_API_KEY,
});

// VCR: auto-record if fixture missing, playback if exists
const driver = await devtools.driver("hello-test", {
  message: "Hello!",
});
```

### Workflow

1. **Write test** with a fixture name (e.g., `"my-scenario"`)
2. **First run** - devtools calls real API, saves to `fixtures/my-scenario.json`
3. **Commit fixture** - `git add fixtures/my-scenario.json`
4. **Future runs** - uses fixture, no API needed

### Directory Structure

```
bdd/
├── fixtures/              # Recorded API responses (VCR)
│   ├── hello-test.json
│   └── tool-call-test.json
├── features/
│   └── devtools/
│       └── devtools.feature
├── steps/
│   └── devtools.steps.ts
├── support/
│   └── world.ts
└── README.md
```

## Environment Variables

Environment is loaded from **monorepo root** `/.env.local` (one place for all packages).

```bash
# Copy template
cp .env.example .env.local

# Edit with your values
vim .env.local
```

`.env.local` contents:

```bash
DEEPRACTICE_API_KEY=cr_xxxxx
DEEPRACTICE_BASE_URL=https://relay.deepractice.ai/api
DEEPRACTICE_MODEL=claude-haiku-4-5-20251001

USE_REAL_API=true  # Use real API (for recording)
USE_REAL_API=false # Use MockDriver (default, for CI)
```

## Devtools API

```typescript
import { createDevtools } from "@agentxjs/devtools";

const devtools = createDevtools({
  fixturesDir: "./fixtures",
  apiKey: process.env.DEEPRACTICE_API_KEY,
});

// Get driver (VCR mode)
const driver = await devtools.driver("name", { message: "Hello!" });

// Get DriverFactory (for Runtime)
const factory = devtools.factory("name", { message: "Hello!" });

// Other APIs
devtools.exists("name"); // Check if fixture exists
await devtools.load("name"); // Load fixture
await devtools.record("name", {}); // Force record
await devtools.delete("name"); // Delete fixture
```

## Tips

- **Fixtures are deterministic** - same input → same output
- **Commit fixtures** - enables CI without API keys
- **Use `forceRecord: true`** to update existing fixtures
- **Haiku model** is cheap and fast for recording
