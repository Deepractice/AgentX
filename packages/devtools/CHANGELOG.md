# @agentxjs/devtools

## 2.0.2

### Patch Changes

- Updated dependencies [cddf2e3]
  - @agentxjs/core@2.0.2
  - agentxjs@2.0.2
  - @agentxjs/claude-driver@2.0.2

## 2.0.1

### Patch Changes

- agentxjs@2.0.1
- @agentxjs/core@2.0.1
- @agentxjs/claude-driver@2.0.1

## 2.0.0

### Major Changes

- 3b764d8: feat: AgentX v2.0 — architectural overhaul

  Major restructuring from 9 packages to 15 (7 packages + 2 apps). Key changes:

  - New `@agentxjs/core` package consolidating agent lifecycle, event system, runtime, and platform abstractions
  - New `@agentxjs/node-platform` for Node.js-specific implementations (persistence, MQ, network)
  - New `@agentxjs/server` for WebSocket server with platform support
  - New `@agentxjs/claude-driver` extracted as standalone Claude API driver
  - New `@agentxjs/mono-driver` for unified cross-platform driver via Vercel AI SDK
  - New `@agentxjs/devtools` for MockDriver, RecordingDriver, fixtures, and BDD tooling
  - `agentxjs` becomes the unified client SDK entry point

### Patch Changes

- Updated dependencies [3b764d8]
  - agentxjs@2.0.0
  - @agentxjs/core@2.0.0
  - @agentxjs/claude-driver@2.0.0
