# @agentxjs/devtools

Development and testing tools for AgentX. Provides BDD utilities, AI-powered testing, plus VCR-style fixture recording/replay for deterministic LLM testing.

## Overview

`@agentxjs/devtools` has two parts:

1. **BDD Utilities** (`@agentxjs/devtools/bdd`) -- AI-powered UI testing, documentation testing, dev server management, path utilities.
2. **VCR Infrastructure** -- `MockDriver`, `RecordingDriver`, `createVcrCreateDriver` for recording and replaying LLM interactions in unit tests.

## Quick Start: BDD Testing

### 1. Set up BDD runner

BDD tests use `@deepracticex/bdd` — a Bun-native Cucumber-compatible framework. Same API (`Given`, `When`, `Then`, `World`), runs directly with `bun test`.

```typescript
// bdd/run.test.ts
import { configure } from "@deepracticex/bdd";

await configure({
  features: ["bdd/journeys/**/*.feature"],
  steps: ["bdd/support/**/*.ts", "bdd/steps/**/*.ts"],
  tags: "not @pending",
  timeout: 30_000,
});
```

Run with `bun test bdd/`.

### 2. Use agentUiTester for UI tests

```typescript
import { agentUiTester } from "@agentxjs/devtools/bdd";

const result = agentUiTester(`
  Navigate to http://localhost:3000
  Verify redirect to /setup
  Fill email "admin@example.com", password "admin123"
  Click Setup
  Verify logged in as admin
`);

assert.ok(result.passed, result.output);
```

### 3. Start a dev server in tests

```typescript
import { startDevServer, stopDevServer } from "@agentxjs/devtools/bdd";

// In BeforeAll hook
await startDevServer({ cwd: "/path/to/app", port: 3000 });

// In AfterAll hook
stopDevServer();
```

### 4. Use MockDriver for unit tests

MockDriver replays recorded fixtures — no network calls, fully deterministic. Use it when you need to test code that interacts with a Driver without hitting a real LLM API.

```typescript
import { MockDriver } from "@agentxjs/devtools";
import { SIMPLE_REPLY } from "@agentxjs/devtools/fixtures";

// Create a mock driver from a built-in fixture
const driver = new MockDriver({ fixture: SIMPLE_REPLY });
await driver.initialize();

for await (const event of driver.receive({ content: "Hello" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

Built-in fixtures: `SIMPLE_REPLY`, `LONG_REPLY`, `TOOL_CALL`, `ERROR`, `EMPTY`.

To use your own recorded fixture:

```typescript
import { MockDriver, getFixture } from "@agentxjs/devtools";

const fixture = getFixture("my-recorded-scenario"); // from fixtures directory
const driver = new MockDriver({ fixture });
```

## Quick Start: VCR Recording

Record real LLM interactions once, replay them in subsequent test runs:

```typescript
import { createDevtools } from "@agentxjs/devtools";

const devtools = createDevtools({
  fixturesDir: "./fixtures",
  apiKey: process.env.ANTHROPIC_API_KEY, // only needed for recording
});

// Fixture exists  --> playback (MockDriver)
// Fixture missing --> call real API, record, save, return MockDriver
const driver = await devtools.driver("greeting-test", {
  message: "Hello!",
});

await driver.initialize();
for await (const event of driver.receive(userMessage)) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}
await driver.dispose();
```

### VCR with Server (Integration Tests)

Use `createVcrCreateDriver` to wrap a real driver with VCR logic — ideal for BDD tests that run through the full server stack:

```typescript
import { createVcrCreateDriver } from "@agentxjs/devtools";

const vcrCreateDriver = createVcrCreateDriver({
  fixturesDir: "./fixtures",
  getFixtureName: () => currentFixture,
  apiKey: process.env.ANTHROPIC_API_KEY,
  createRealDriver: createMonoDriver,
  onPlayback: (name) => console.log(`Playback: ${name}`),
  onRecording: (name) => console.log(`Recording: ${name}`),
});

const server = await createServer({ platform, createDriver: vcrCreateDriver });
```

## API Reference

### BDD API (`@agentxjs/devtools/bdd`)

#### `createCucumberConfig(options)` *(legacy)*

> **Deprecated**: Use `configure()` from `@deepracticex/bdd` instead. See Quick Start above.

Generates a Cucumber.js config object. Kept for backward compatibility with projects still using `@cucumber/cucumber`.

#### `agentUiTester(prompt, options?): UiTestResult`

Runs a UI test scenario using Claude CLI + agent-browser.

```typescript
interface UiTesterOptions {
  model?: string; // default: "haiku"
  baseUrl?: string;
  timeout?: number; // default: 300000 (5 min)
  headed?: boolean; // default: false
}

interface UiTestResult {
  passed: boolean;
  output: string;
}
```

#### `agentDocTester(options, testerOptions?): DocTestResult`

Evaluates documents against requirements using AgentX. Assesses completeness, logic, and readability.

```typescript
import { agentDocTester } from "@agentxjs/devtools/bdd";

const result = await agentDocTester({
  files: ["packages/core/README.md"],
  requirements: `
    The README should explain Container, Image, Session, Driver, Platform.
    There should be a Quick Start example.
  `,
});

assert.ok(result.passed, result.output);
```

```typescript
interface DocTesterOptions {
  provider?: string; // default: "anthropic"
  model?: string; // default: "claude-haiku-4-5-20251001"
  apiKey?: string; // reads from DEEPRACTICE_API_KEY or ANTHROPIC_API_KEY
  baseUrl?: string; // reads from DEEPRACTICE_BASE_URL
  timeout?: number; // default: 120000 (2 min)
}
```

#### `startDevServer(options): Promise<void>`

```typescript
interface DevServerOptions {
  cwd: string;
  port: number;
  command?: string; // default: "bun"
  args?: string[]; // default: ["run", "dev"]
  timeout?: number; // default: 30000
  debug?: boolean; // default: !!process.env.DEBUG
}
```

#### Path Utilities

```typescript
import { getFixturesPath, getTempPath, ensureDir, getMonorepoPath } from "@agentxjs/devtools/bdd";
```

### VCR API (main entry)

#### `createDevtools(config: DevtoolsConfig): Devtools`

```typescript
interface DevtoolsConfig {
  fixturesDir: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  createDriver?: CreateDriver;
}
```

| Method                                   | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| `driver(name, options): Promise<Driver>` | Get driver — playback if fixture exists, record otherwise |
| `load(name): Promise<Fixture>`           | Load a fixture by name                                    |
| `exists(name): boolean`                  | Check if fixture exists                                   |
| `delete(name): Promise<void>`            | Delete a fixture                                          |

#### `MockDriver`

Replays events from a fixture. No network calls.

```typescript
import { MockDriver, createMockDriver } from "@agentxjs/devtools";

const driver = new MockDriver({ fixture: myFixture });
```

#### `RecordingDriver`

Wraps a real driver and records all events.

```typescript
import { createRecordingDriver } from "@agentxjs/devtools";

const recorder = createRecordingDriver({ driver: realDriver, name: "my-scenario" });
const fixture = recorder.getFixture(); // after recording
```

#### Built-in Fixtures

```typescript
import { SIMPLE_REPLY, TOOL_CALL, getFixture, listFixtures } from "@agentxjs/devtools/fixtures";

listFixtures(); // ["simple-reply", "long-reply", "tool-call", "error", "empty"]
```

## Configuration

### Package Exports

| Import path                   | Contents                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `@agentxjs/devtools`          | VCR: `Devtools`, `MockDriver`, `RecordingDriver`, fixtures                              |
| `@agentxjs/devtools/mock`     | `MockDriver`, `createMockDriver`                                                        |
| `@agentxjs/devtools/recorder` | `RecordingDriver`, `createRecordingDriver`                                              |
| `@agentxjs/devtools/fixtures` | Built-in fixtures, `getFixture`, `listFixtures`                                         |
| `@agentxjs/devtools/bdd`      | BDD: `agentUiTester`, `agentDocTester`, `startDevServer`, paths, `createCucumberConfig` (legacy) |

### Peer Dependencies (optional)

| Package                   | When needed                                          |
| ------------------------- | ---------------------------------------------------- |
| `agentxjs`                | `agentDocTester` (uses AgentX SDK for AI evaluation) |
| `@agentxjs/claude-driver` | Recording with claude-driver                         |
| `@playwright/test`        | Browser-based BDD tests                              |
| `@deepracticex/bdd`       | BDD test runner (replaces @cucumber/cucumber)        |
