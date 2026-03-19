# @agentxjs/devtools

## 2.3.0

### Minor Changes

- c2ccfa7: refactor!: replace Embodiment + DriverConfig with AgentContext + SendOptions

  **BREAKING CHANGE**: Configuration architecture restructured into a 3-layer model.

  ### What changed

  - **Deleted `Embodiment`** — `model`, `systemPrompt`, `mcpServers`, `thinking`, `providerOptions` are now flat fields on `ImageRecord`, `Agent`, and `PrototypeRecord`
  - **Deleted `DriverConfigBase` / `DriverConfig`** — replaced by `AgentContext`
  - **New `AgentContext`** — the merged configuration object passed from Runtime to Driver
  - **New `SendOptions`** — per-request overrides for `model`, `thinking`, `providerOptions`
  - **Full-chain `SendOptions`**: `Presentation.send()` → `Session.send()` → `Runtime.receive()` → `Driver.receive()`
  - **`CreateDriver` signature**: `(config: AgentContext & TOptions) => Driver`

  ### Migration

  ```typescript
  // Before
  const config: DriverConfig<MonoDriverOptions> = { ... };
  imageRecord.embody?.model

  // After
  const config: AgentContext & MonoDriverOptions = { ... };
  imageRecord.model

  // Per-request overrides (new!)
  await agent.send("Hello", { thinking: "high", model: "claude-opus-4-6" });
  await presentation.send("Hello", { thinking: "disabled" });
  ```

### Patch Changes

- Updated dependencies [6cf3504]
- Updated dependencies [c2ccfa7]
- Updated dependencies [5fcc46e]
- Updated dependencies [e00d2fc]
- Updated dependencies [3ded673]
- Updated dependencies [6957af0]
- Updated dependencies [366fb38]
- Updated dependencies [b13f9c3]
- Updated dependencies [24bab4c]
- Updated dependencies [bee5231]
  - @agentxjs/core@2.9.0

## 2.2.1

### Patch Changes

- Updated dependencies [724e53d]
  - @agentxjs/core@2.8.0

## 2.2.0

### Minor Changes

- f3f9686: BREAKING: rename `agentId` to `instanceId` across all public APIs

  - `RuntimeAgent.agentId` → `RuntimeAgent.instanceId`
  - `CreateAgentOptions.agentId` → `CreateAgentOptions.instanceId`
  - `DriverConfigBase.agentId` → `DriverConfigBase.instanceId`
  - `AgentXErrorContext.agentId` → `AgentXErrorContext.instanceId`
  - `EventContext.agentId` → `EventContext.instanceId`
  - All command/container/session event data: `agentId` → `instanceId`
  - RPC methods: `agent.*` → `instance.*`
  - SDK types: `AgentNamespace` → `InstanceNamespace`, `AgentCreateResponse` → `InstanceCreateResponse`, etc.
  - `RuntimeNamespace.agent` → `RuntimeNamespace.instance`
  - ID prefix: `agent_` → `inst_`
  - `AgentHandle.agentId` → `AgentHandle.instanceId`

### Patch Changes

- Updated dependencies [f3f9686]
  - @agentxjs/core@2.7.0

## 2.1.5

### Patch Changes

- @agentxjs/core@2.6.1

## 2.1.4

### Patch Changes

- Updated dependencies [e1b44f7]
  - @agentxjs/core@2.6.0

## 2.1.3

### Patch Changes

- Updated dependencies [266840a]
- Updated dependencies [37a0a42]
  - @agentxjs/core@2.5.0

## 2.1.2

### Patch Changes

- Updated dependencies [88cb9a6]
  - @agentxjs/core@2.4.0

## 2.1.1

### Patch Changes

- fix(core): inject LLM provider config into DriverConfig during createAgent

  Runtime now reads the container's default LLM provider and injects apiKey, baseUrl, and model into DriverConfig before calling createDriver. Previously these fields were empty, causing requests to hit wrong endpoints with wrong credentials.

- Updated dependencies
  - @agentxjs/core@2.3.1

## 2.1.0

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

## 2.0.8

### Patch Changes

- Updated dependencies [207a986]
  - @agentxjs/core@2.2.0

## 2.0.7

### Patch Changes

- @agentxjs/core@2.1.1

## 2.0.6

### Patch Changes

- Updated dependencies [ac62a6a]
  - @agentxjs/core@2.1.0

## 2.0.5

### Patch Changes

- Updated dependencies [b867690]
  - @agentxjs/core@2.0.5
  - agentxjs@2.0.5
  - @agentxjs/claude-driver@2.0.5

## 2.0.4

### Patch Changes

- 7eeeeaa: Fluent builder API and server merge

  - `createAgentX(config?)` returns a builder supporting local, remote (`.connect()`), and server (`.serve()`) modes
  - Namespace properties changed to singular: `container`, `image`, `agent`, `session`, `presentation`
  - Merged `@agentxjs/server` into `agentxjs` — `createServer` and `CommandHandler` now exported from `agentxjs`
  - Removed `@agentxjs/server` package
  - `agentxjs` is now environment-agnostic (no direct dependency on `node-platform` or `mono-driver`)

- Updated dependencies [7eeeeaa]
  - agentxjs@2.0.4
  - @agentxjs/core@2.0.4
  - @agentxjs/claude-driver@2.0.4

## 2.0.3

### Patch Changes

- agentxjs@2.0.3
- @agentxjs/core@2.0.3
- @agentxjs/claude-driver@2.0.3

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
