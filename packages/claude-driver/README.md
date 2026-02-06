# @agentxjs/claude-driver

Claude Code SDK-based driver for AgentX. Connects to Claude via the `@anthropic-ai/claude-code` SDK through a subprocess-based architecture.

## Overview

**For most use cases, use `@agentxjs/mono-driver` instead.** MonoDriver supports multiple providers, runs cross-platform, and is the default in `createAgentX`.

Use claude-driver when you specifically need:
- Claude Code SDK subprocess execution
- Built-in permission management from Claude Code
- Claude Code CLI integration
- Session continuity via Claude's native session resume

## Quick Start

```typescript
import { createClaudeDriver } from "@agentxjs/claude-driver";

const driver = createClaudeDriver({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentId: "my-agent",
  systemPrompt: "You are a helpful assistant.",
});

await driver.initialize();

for await (const event of driver.receive({ content: "Hello!" })) {
  if (event.type === "text_delta") {
    process.stdout.write(event.data.text);
  }
}

await driver.dispose();
```

## API Reference

### `createClaudeDriver(config: ClaudeDriverConfig): Driver`

Factory function. Returns a `Driver` conforming to `@agentxjs/core/driver`.

### ClaudeDriver

```typescript
class ClaudeDriver implements Driver {
  readonly name: string;              // "ClaudeDriver"
  readonly sessionId: string | null;  // captured from SDK after first message
  readonly state: DriverState;        // "idle" | "active" | "disposed"

  initialize(): Promise<void>;
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;
  interrupt(): void;
  dispose(): Promise<void>;
}
```

### Exported Types

```typescript
// Main
export { ClaudeDriver, createClaudeDriver, ClaudeDriverOptions, ClaudeDriverConfig };

// Re-exported from @agentxjs/core/driver
export type { Driver, DriverConfig, DriverState, CreateDriver, DriverStreamEvent, StopReason };

// Internal utilities (advanced)
export { SDKQueryLifecycle, buildSDKContent, buildSDKUserMessage };
```

## Configuration

### ClaudeDriverConfig

`ClaudeDriverConfig` = `DriverConfig<ClaudeDriverOptions>`.

```typescript
createClaudeDriver({
  // Base DriverConfig
  apiKey: "sk-ant-xxxxx",           // required
  agentId: "my-agent",              // required
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are ...",
  baseUrl: "https://api.anthropic.com",
  cwd: "/path/to/workdir",
  mcpServers: { ... },
  resumeSessionId: "prev-session-id",
  onSessionIdCaptured: (id) => save(id),

  // ClaudeDriver-specific
  options: {
    claudeCodePath: "/usr/local/bin/claude",  // auto-resolved if omitted
    maxTurns: 10,                              // SDK default if omitted
  },
});
```

### ClaudeDriverOptions

| Field | Type | Default | Description |
|---|---|---|---|
| `claudeCodePath` | `string` | Auto-resolved from `@anthropic-ai/claude-code` | Path to Claude Code executable |
| `maxTurns` | `number` | SDK default | Max agentic loop turns |

### Session Resumption

```typescript
let savedSessionId: string;

const driver = createClaudeDriver({
  apiKey: "...",
  agentId: "my-agent",
  onSessionIdCaptured: (id) => { savedSessionId = id; },
});

// ... use driver, then dispose ...

// Resume later
const resumed = createClaudeDriver({
  apiKey: "...",
  agentId: "my-agent",
  resumeSessionId: savedSessionId,
});
```

### Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (can also use `apiKey` config) |
| `ANTHROPIC_BASE_URL` | Custom API endpoint (can also use `baseUrl` config) |
