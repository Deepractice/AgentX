# agentxjs

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

### Minor Changes

- 207a986: Add AgentXError top-level error type, circuit breaker, and onError API

  - New `@agentxjs/core/error` module with `AgentXError` class and `CircuitBreaker`
  - `AgentXError` is a core-level type (like `AgentXPlatform`) with category, code, recoverability
  - Circuit breaker protects against cascading LLM driver failures (5 failures → open → 30s cooldown)
  - Message persistence failures now emit `AgentXError` via EventBus instead of being silently swallowed
  - New `ax.onError(handler)` top-level API on AgentX interface for structured error handling

### Patch Changes

- Updated dependencies [207a986]
  - @agentxjs/core@2.2.0

## 2.1.1

### Patch Changes

- 3ac6caf: fix: remove unused ws and reconnecting-websocket dependencies

  These Node.js-only packages were never imported in agentxjs source code
  (they belong in @agentxjs/node-platform). Their presence caused bundlers
  like Turbopack/webpack to pull Node.js dependencies into browser builds,
  even with dynamic imports.

  - @agentxjs/core@2.1.1

## 2.1.0

### Minor Changes

- ac62a6a: feat: add universal rpc() method to AgentX interface

  Add ax.rpc(method, params) as a transport-agnostic JSON-RPC entry point
  that works across all modes (Local, Remote, Builder). Enables custom
  transport scenarios like Cloudflare Workers/DO without requiring internal APIs.

### Patch Changes

- Updated dependencies [ac62a6a]
  - @agentxjs/core@2.1.0

## 2.0.5

### Patch Changes

- b867690: fix: await assistant message persistence in receive() and add image.getMessages API

  - runtime.receive() now awaits all pending message persists before returning,
    ensuring assistant messages are fully written in serverless environments
  - Added image.getMessages(imageId) to ImageNamespace for querying message
    history by imageId without requiring a live agentId

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
- @agentxjs/node-platform@2.0.3
- @agentxjs/mono-driver@2.0.3

## 2.0.2

### Patch Changes

- cddf2e3: Inject channel server/client via Platform DI. Rename WebSocketFactory → ChannelClientFactory, webSocketFactory → channelClient. Server reads channelServer from Platform instead of importing WebSocketServer directly, enabling non-Node platforms (e.g. Cloudflare DO) to provide their own ChannelServer implementation.
- Updated dependencies [cddf2e3]
  - @agentxjs/core@2.0.2
  - @agentxjs/node-platform@2.0.2
  - @agentxjs/mono-driver@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies [d63ad17]
  - @agentxjs/mono-driver@2.0.1
  - @agentxjs/core@2.0.1
  - @agentxjs/node-platform@2.0.1

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
  - @agentxjs/node-platform@2.0.0
  - @agentxjs/mono-driver@2.0.0
