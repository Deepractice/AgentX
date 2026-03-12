# @agentxjs/claude-driver

## 2.4.0

### Patch Changes

- Updated dependencies [88cb9a6]
  - @agentxjs/core@2.4.0

## 2.3.1

### Patch Changes

- fix(core): inject LLM provider config into DriverConfig during createAgent

  Runtime now reads the container's default LLM provider and injects apiKey, baseUrl, and model into DriverConfig before calling createDriver. Previously these fields were empty, causing requests to hit wrong endpoints with wrong credentials.

- Updated dependencies
  - @agentxjs/core@2.3.1

## 2.3.0

### Minor Changes

- 938939d: feat: add ax.llm namespace for LLM provider management

  - New `ax.llm` namespace with full CRUD API (create, get, list, update, delete, setDefault, getDefault)
  - LLM providers separate vendor (who provides) from protocol (API format)
  - Driver interface now declares `supportedProtocols` for protocol validation
  - `createAgent` validates LLM provider protocol against driver's supported protocols
  - BDD framework migrated from @cucumber/cucumber to @deepracticex/bdd (Bun-native)
  - Documentation updated across all packages

### Patch Changes

- Updated dependencies [938939d]
  - @agentxjs/core@2.3.0

## 2.2.0

### Patch Changes

- Updated dependencies [207a986]
  - @agentxjs/core@2.2.0

## 2.1.1

### Patch Changes

- @agentxjs/core@2.1.1

## 2.1.0

### Patch Changes

- Updated dependencies [ac62a6a]
  - @agentxjs/core@2.1.0

## 2.0.5

### Patch Changes

- Updated dependencies [b867690]
  - @agentxjs/core@2.0.5

## 2.0.4

### Patch Changes

- 7eeeeaa: Fluent builder API and server merge

  - `createAgentX(config?)` returns a builder supporting local, remote (`.connect()`), and server (`.serve()`) modes
  - Namespace properties changed to singular: `container`, `image`, `agent`, `session`, `presentation`
  - Merged `@agentxjs/server` into `agentxjs` — `createServer` and `CommandHandler` now exported from `agentxjs`
  - Removed `@agentxjs/server` package
  - `agentxjs` is now environment-agnostic (no direct dependency on `node-platform` or `mono-driver`)

- Updated dependencies [7eeeeaa]
  - @agentxjs/core@2.0.4

## 2.0.3

### Patch Changes

- @agentxjs/core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [cddf2e3]
  - @agentxjs/core@2.0.2

## 2.0.1

### Patch Changes

- @agentxjs/core@2.0.1

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
  - @agentxjs/core@2.0.0
