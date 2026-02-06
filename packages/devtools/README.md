# @agentxjs/devtools

Development and testing tools for AgentX. Provides VCR-style fixture recording/replay for deterministic LLM testing, plus BDD utilities for Cucumber-based integration tests.

## Overview

`@agentxjs/devtools` has two parts:

1. **VCR Infrastructure** -- `MockDriver`, `RecordingDriver`, `Devtools`, `createVcrCreateDriver` for recording and replaying LLM interactions.
2. **BDD Utilities** (`@agentxjs/devtools/bdd`) -- `createCucumberConfig`, `agentUiTester`, `agentDocTester`, `startDevServer` for Cucumber-based testing.

## Quick Start

### VCR: Record and Replay

```typescript
import { createDevtools } from "@agentxjs/devtools";

const devtools = createDevtools({
  fixturesDir: "./fixtures",
  apiKey: process.env.ANTHROPIC_API_KEY,  // only needed for recording
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

### BDD: Cucumber Config

```typescript
// cucumber.js
import { createCucumberConfig } from "@agentxjs/devtools/bdd";

export default createCucumberConfig({
  paths: ["bdd/journeys/**/*.feature"],
  import: ["bdd/steps/**/*.ts"],
});
```

## API Reference

### VCR API (main entry)

#### `createDevtools(config: DevtoolsConfig): Devtools`

```typescript
interface DevtoolsConfig {
  fixturesDir: string;          // directory for fixture JSON files
  apiKey?: string;               // API key (required for recording)
  baseUrl?: string;              // API base URL
  model?: string;                // LLM model
  systemPrompt?: string;         // default system prompt
  cwd?: string;                  // working directory
  createDriver?: CreateDriver;   // custom driver factory (default: claude-driver)
}
```

**Devtools methods**:

| Method | Description |
|---|---|
| `driver(name, options): Promise<Driver>` | Get driver -- playback if fixture exists, record otherwise |
| `load(name): Promise<Fixture>` | Load a fixture by name |
| `exists(name): boolean` | Check if fixture exists |
| `delete(name): Promise<void>` | Delete a fixture |
| `createDriverForFixture(name): CreateDriver` | Sync factory for existing fixture |

```typescript
interface DriverOptions {
  message: string;           // user message for recording
  systemPrompt?: string;     // override system prompt
  cwd?: string;              // override working directory
  forceRecord?: boolean;     // re-record even if fixture exists
}
```

#### `createVcrCreateDriver(config: VcrCreateDriverConfig): CreateDriver`

Creates a `CreateDriver` with embedded VCR logic. Best for integration with `@agentxjs/server`.

```typescript
import { createVcrCreateDriver } from "@agentxjs/devtools";

let currentFixture: string | null = null;

const vcrCreateDriver = createVcrCreateDriver({
  fixturesDir: "./fixtures",
  getFixtureName: () => currentFixture,
  apiKey: process.env.ANTHROPIC_API_KEY,
  createRealDriver: createMonoDriver,
  onPlayback: (name) => console.log(`Playback: ${name}`),
  onRecording: (name) => console.log(`Recording: ${name}`),
  onSaved: (name, count) => console.log(`Saved: ${name} (${count} events)`),
});

// Use with server
const server = await createServer({ platform, createDriver: vcrCreateDriver });

// Before each test
currentFixture = "test-scenario";
```

```typescript
interface VcrCreateDriverConfig {
  fixturesDir: string;
  getFixtureName: () => string | null;    // null = skip VCR, use real driver
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  createRealDriver?: CreateDriver;
  onPlayback?: (name: string) => void;
  onRecording?: (name: string) => void;
  onSaved?: (name: string, eventCount: number) => void;
}
```

#### `MockDriver`

Replays events from a fixture. No network calls.

```typescript
import { MockDriver, createMockDriver } from "@agentxjs/devtools";

const driver = new MockDriver({ fixture: myFixture });
await driver.initialize();
for await (const event of driver.receive(msg)) { ... }
```

Built-in fixtures: `"simple-reply"`, `"long-reply"`, `"tool-call"`, `"error"`, `"empty"`.

#### `RecordingDriver`

Wraps a real driver and records all events.

```typescript
import { createRecordingDriver } from "@agentxjs/devtools";

const recorder = createRecordingDriver({
  driver: realDriver,
  name: "my-scenario",
});
await recorder.initialize();
for await (const event of recorder.receive(msg)) { ... }

const fixture = recorder.getFixture();
await recorder.dispose();
```

#### Built-in Fixtures

```typescript
import { SIMPLE_REPLY, TOOL_CALL, getFixture, listFixtures } from "@agentxjs/devtools";

listFixtures();  // ["simple-reply", "long-reply", "tool-call", "error", "empty"]
```

### BDD API (`@agentxjs/devtools/bdd`)

#### `createCucumberConfig(options: CucumberConfigOptions)`

Generates a Cucumber configuration object.

```typescript
interface CucumberConfigOptions {
  paths: string[];         // feature file paths
  import: string[];        // step definition paths
  tags?: string;           // default: "not @pending and not @skip"
  timeout?: number;        // default: 30000 ms
  format?: string[];       // default: ["progress"]
}
```

```typescript
import { createCucumberConfig } from "@agentxjs/devtools/bdd";

export default createCucumberConfig({
  paths: ["bdd/journeys/**/*.feature"],
  import: ["bdd/steps/**/*.ts"],
  tags: "not @pending and not @skip",
  timeout: 60000,
});
```

#### `agentUiTester(prompt, options?): UiTestResult`

Runs a UI test scenario using Claude CLI + agent-browser. Spawns a Claude subprocess that drives a real Chrome browser.

```typescript
import { agentUiTester } from "@agentxjs/devtools/bdd";

const result = agentUiTester(`
  Navigate to http://localhost:3000
  Verify redirect to /setup
  Fill email "admin@example.com", password "admin123"
  Click Setup
  Verify logged in as admin
`);

expect(result.passed).toBe(true);
```

```typescript
interface UiTesterOptions {
  model?: string;       // default: "haiku"
  baseUrl?: string;
  timeout?: number;     // default: 300000 (5 min)
  headed?: boolean;     // default: false
}

interface UiTestResult {
  passed: boolean;
  output: string;
}
```

#### `agentDocTester(options, testerOptions?): DocTestResult`

Evaluates documents against requirements using Claude CLI.

```typescript
import { agentDocTester } from "@agentxjs/devtools/bdd";

const result = agentDocTester({
  files: ["packages/core/README.md"],
  requirements: `
    The README should explain Container, Image, Session, Driver, Platform.
    There should be a Quick Start example.
  `,
});

expect(result.passed).toBe(true);
```

```typescript
interface DocTesterOptions {
  model?: string;       // default: "haiku"
  timeout?: number;     // default: 120000 (2 min)
}

interface DocTestResult {
  passed: boolean;
  output: string;
}
```

#### `startDevServer(options): Promise<void>`

Starts a dev server and waits for it to be ready.

```typescript
import { startDevServer, stopDevServer } from "@agentxjs/devtools/bdd";

await startDevServer({
  cwd: "/path/to/app",
  port: 3000,
  command: "bun",         // default: "bun"
  args: ["run", "dev"],   // default: ["run", "dev"]
  timeout: 30000,         // default: 30000 ms
  debug: false,           // default: false (true if DEBUG env set)
});

// ... run tests ...

stopDevServer();
```

```typescript
interface DevServerOptions {
  cwd: string;
  port: number;
  command?: string;       // default: "bun"
  args?: string[];        // default: ["run", "dev"]
  timeout?: number;       // default: 30000
  debug?: boolean;        // default: !!process.env.DEBUG
}
```

#### Path Utilities

```typescript
import { paths, getMonorepoPath, getPackagePath, getBddPath } from "@agentxjs/devtools/bdd";
```

#### Playwright Helpers

```typescript
import { launchBrowser, getPage, closeBrowser, waitForUrl } from "@agentxjs/devtools/bdd";
```

## Configuration

### Package Exports

| Import path | Contents |
|---|---|
| `@agentxjs/devtools` | VCR: `Devtools`, `MockDriver`, `RecordingDriver`, fixtures |
| `@agentxjs/devtools/mock` | `MockDriver`, `createMockDriver` |
| `@agentxjs/devtools/recorder` | `RecordingDriver`, `createRecordingDriver` |
| `@agentxjs/devtools/fixtures` | Built-in fixtures, `getFixture`, `listFixtures` |
| `@agentxjs/devtools/bdd` | BDD: `createCucumberConfig`, `agentUiTester`, `agentDocTester`, `startDevServer`, paths, Playwright |

### Peer Dependencies (optional)

| Package | When needed |
|---|---|
| `@agentxjs/claude-driver` | Recording with claude-driver |
| `@playwright/test` | Browser-based BDD tests |
| `@cucumber/cucumber` | BDD test runner |
