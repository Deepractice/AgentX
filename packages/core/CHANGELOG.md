# @agentxjs/core

## 2.9.0

### Minor Changes

- 6cf3504: feat!: introduce AgentOS — unified fs + shell for agents

  ### What changed

  - **New `AgentOS`** — unified operating system abstraction combining FileSystem + Shell + Environment
  - **5 tools replace 7**: `read`, `write`, `edit`, `sh`, `start` (removed `bash`, `grep`, `glob`, `list`)
  - **`sh` replaces `bash`** — shares filesystem with `read`/`write`/`edit`
  - **`start` is new** — launch background processes, get pid for lifecycle management
  - **`OSProvider`** replaces `WorkspaceProvider` + `BashProvider` on `AgentXPlatform`
  - **`LocalOS`** implementation for Node.js (fs/promises + execa)

  ### Migration

  ```typescript
  // Before
  platform.bashProvider;
  platform.workspaceProvider;

  // After
  platform.osProvider;

  // Before: 7 tools (read, write, edit, list, grep, glob, bash)
  // After:  5 tools (read, write, edit, sh, start)
  // grep/glob/list/ps/kill all go through sh tool
  ```

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

- 5fcc46e: feat!: make containerId configurable on AgentXPlatform

  ### What changed

  - `AgentXPlatform.containerId` is now a required field
  - All handlers and namespaces read containerId from platform instead of hardcoding `DEFAULT_CONTAINER_ID`
  - Remote clients no longer send containerId in RPC params — server uses its own platform config
  - `NodePlatformOptions.containerId` added (defaults to "default")

  ### Why

  Different products (monogent, admin playground, etc.) sharing the same Actor DO
  can now isolate their data via different container IDs.

  ### Migration

  ```typescript
  // Before — containerId was always "default"
  const platform: AgentXPlatform = {
    containerRepository,
    imageRepository,
    // ...
  };

  // After — containerId is required
  const platform: AgentXPlatform = {
    containerId: "monogent", // or DEFAULT_CONTAINER_ID for "default"
    containerRepository,
    imageRepository,
    // ...
  };
  ```

- 3ded673: Remove subscribe/unsubscribe mechanism — server broadcasts all events to all connections

  **Breaking change**: `AgentX.subscribe()` method removed from the interface. This was an internal detail that consumers should not have needed to call directly.

  Server now sends all broadcastable events to all connected clients without topic filtering. Client-side Presentation already filters events by instanceId/imageId.

  This fixes the bug where page refresh or WebSocket reconnect caused Presentation `onUpdate` to stop firing due to lost session subscriptions.

- 6957af0: refactor!: remove workspace abstraction — OS is the only abstraction

  - `ImageRecord.workspaceId` → `osId`
  - `PresentationWorkspace` → `PresentationOS`
  - `WorkspaceState` → `OSState`
  - `pres.workspace` → `pres.os`
  - RPC `workspace.read/list/write` → `os.read/list/write`
  - Tool descriptions no longer mention "workspace root"

- 366fb38: refactor!: rename contextId to roleId across all types

  ### What changed

  - `Agent.contextId` → `Agent.roleId`
  - `ImageRecord.contextId` → `ImageRecord.roleId`
  - `PrototypeRecord.contextId` → `PrototypeRecord.roleId`
  - `AgentConfig.contextId` → `AgentConfig.roleId`
  - `ContextProvider.create(contextId)` → `ContextProvider.create(roleId)`
  - All JSDoc updated accordingly

  ### Why

  `contextId` was ambiguous — Context is a broad concept (Layer 2 cognitive context).
  What's actually passed is a role identifier (e.g. a RoleX individual ID).
  `roleId` makes the semantic intent clear: the ID points to a specific role,
  which is one concrete pointer within the Context system.

  ### Migration

  ```typescript
  // Before
  ax.chat.create({ contextId: "aristotle" });

  // After
  ax.chat.create({ roleId: "aristotle" });
  ```

- b13f9c3: feat!: define RpcMethod as union type — single source of truth for all RPC methods

  ### What changed

  - `RpcMethod` changed from `string` to a string literal union of all 25 valid methods
  - Handler registration and client calls now type-checked at compile time
  - Fixed: RemoteClient called `workspace.read/write/list` but handlers registered `os.read/write/list`

  ### Methods defined

  - `image.*` (8): create, get, list, delete, run, stop, update, messages
  - `instance.*` (5): get, list, destroy, destroyAll, interrupt
  - `message.*` (1): send
  - `runtime.*` (1): rewind
  - `llm.*` (6): create, get, list, update, delete, default
  - `os.*` (3): read, write, list

- 24bab4c: feat!: unified AgentXClient + three-layer API (chat/present/rpc)

  - Merge LocalClient and RemoteClient into single AgentXClient
  - Three-layer API: ax.chat (high-level), ax.present (UI), ax.rpc() (low-level)
  - Remove RuntimeNamespace, ImageNamespace, SessionNamespace, LLMNamespace from public API
  - Remove RpcMethod union type — registry is the single source of truth
  - Add rpcMethods() for method discovery with descriptions
  - All RPC handlers now register with description metadata
  - Delete 6 redundant createLocal*/createRemote* namespace factories

  BREAKING CHANGE: ax.runtime and ax.provider removed. Use ax.rpc() for low-level operations and ax.present for Presentation.

- bee5231: feat(workspace): add Workspace abstraction with file operations, watcher, and Presentation integration

  Each agent now gets an isolated workspace directory (auto-assigned workspaceId). Workspace tools (read/write/edit/grep/glob/list) are automatically injected when a workspace is available. File tree changes are pushed to PresentationState in real-time via fs.watch. Consumers can operate on the workspace through `presentation.workspace.read/write/list`.

### Patch Changes

- e00d2fc: feat: media resolver, file upload support, and connection pool

  - Add `@agentxjs/core/media` module with MediaResolver and strategies (passthrough, textExtract)
  - MonoDriver: resolve file parts per provider capabilities before sending to LLM
  - MonoDriver: unsupported file types throw UnsupportedMediaTypeError with clear message
  - agentxjs: connection pool with refCount for React 18+ Strict Mode compatibility

## 2.8.0

### Patch Changes

- 724e53d: BREAKING: hide Container from SDK public API

  Container is now an internal concept, auto-managed with DEFAULT_CONTAINER_ID.

  - Remove `containerId` param from `image.create()`, `prototype.create()`, `llm.create()`
  - Remove `containerId` param from `image.list()`, `prototype.list()`, `llm.list()`, `instance.list()`, `llm.getDefault()`
  - Delete `ContainerNamespace`, `ContainerInfo`, `ContainerCreateResponse/GetResponse/ListResponse` types
  - Delete `containers.ts` namespace implementation
  - Remove container RPC handlers from CommandHandler
  - Add `DEFAULT_CONTAINER_ID` constant in `@agentxjs/core/container`
  - All namespace implementations use DEFAULT_CONTAINER_ID internally

## 2.7.0

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

## 2.6.1

## 2.6.0

### Minor Changes

- e1b44f7: Add Prototype registry — reusable agent templates

  - PrototypeRecord and PrototypeRepository in @agentxjs/core/persistence
  - StoragePrototypeRepository in @agentxjs/node-platform
  - ax.prototype.\* namespace (create/get/list/update/delete)
  - RPC methods: prototype.create/get/list/update/delete
  - chat.create() accepts prototypeId to inherit prototype config
  - Add prototypeId field to ImageRecord for origin tracking

## 2.5.0

### Minor Changes

- 266840a: Introduce Embodiment, Agent blueprint, and AgentHandle

  Core:

  - Add Embodiment type: runtime config (model, systemPrompt, mcpServers)
  - Add Agent blueprint type: serializable agent definition (name, contextId, embody)
  - ImageRecord: move systemPrompt/mcpServers into embody, add model support
  - ImageCreateConfig extends Agent — blueprint is portable, config adds containerId
  - Runtime resolves config from embody; image-level model overrides container default

  SDK (agentxjs):

  - New top-level Agent API: ax.create() returns AgentHandle
  - AgentHandle: send(), interrupt(), history(), present(), update(), delete()
  - ax.list() and ax.get() for agent CRUD
  - Instance namespace (ax.instance.\*) for low-level subsystem access
  - Provider namespace (ax.provider.\*) for LLM provider management
  - Presentation namespace renamed to present
  - Export AgentHandle, InstanceNamespace, Embodiment types

- 37a0a42: Context integration — generic cognitive context layer with built-in RoleX support

  Core:

  - Add Context interface (instructions, project(), getTools()) and ContextProvider factory
  - Add RolexContext implementing Context with dynamic RPC dispatch via toArgs()
  - Add RolexContextProvider implementing ContextProvider
  - Rename ImageRecord.roleId to contextId
  - Add contextProvider to AgentXPlatform
  - Runtime auto-creates Context and merges tools when Image has contextId

  MonoDriver:

  - Three-layer system prompt with XML tags: <system>, <instructions>, <context>
  - Migrate from RolexBridge to RolexContext (now in core)

  Node Platform:

  - Built-in RolexContextProvider by default
  - Default paths: ~/.deepractice/agentx and ~/.deepractice/rolex
  - Configurable via dataPath and rolexDataPath options
  - contextProvider: null to disable

## 2.4.0

### Minor Changes

- 88cb9a6: feat(mono-driver): integrate RoleX role system

  - RolexBridge: converts RoleX tools to AgentX ToolDefinition[], manages role lifecycle, provides Role Context projection
  - Three-layer context model: Layer 1 (systemPrompt) + Layer 2 (<role-context> with world instructions + role state) + Layer 3 (messages)
  - Role auto-activates on driver.initialize(), context refreshes every receive() call
  - All-or-nothing config: provide `rolex: { platform, roleId }` to enable, omit to disable
  - DriverConfig flattened: TOptions merged directly into config (no more nested `options`)
  - ImageRecord gains `roleId` field (one Image = one Role = one conversation)
  - DriverConfigBase gains `customData` for pass-through data from persistence layer

## 2.3.1

### Patch Changes

- fix(core): inject LLM provider config into DriverConfig during createAgent

  Runtime now reads the container's default LLM provider and injects apiKey, baseUrl, and model into DriverConfig before calling createDriver. Previously these fields were empty, causing requests to hit wrong endpoints with wrong credentials.

## 2.3.0

### Minor Changes

- 938939d: feat: add ax.llm namespace for LLM provider management

  - New `ax.llm` namespace with full CRUD API (create, get, list, update, delete, setDefault, getDefault)
  - LLM providers separate vendor (who provides) from protocol (API format)
  - Driver interface now declares `supportedProtocols` for protocol validation
  - `createAgent` validates LLM provider protocol against driver's supported protocols
  - BDD framework migrated from @cucumber/cucumber to @deepracticex/bdd (Bun-native)
  - Documentation updated across all packages

## 2.2.0

### Minor Changes

- 207a986: Add AgentXError top-level error type, circuit breaker, and onError API

  - New `@agentxjs/core/error` module with `AgentXError` class and `CircuitBreaker`
  - `AgentXError` is a core-level type (like `AgentXPlatform`) with category, code, recoverability
  - Circuit breaker protects against cascading LLM driver failures (5 failures → open → 30s cooldown)
  - Message persistence failures now emit `AgentXError` via EventBus instead of being silently swallowed
  - New `ax.onError(handler)` top-level API on AgentX interface for structured error handling

## 2.1.1

## 2.1.0

### Minor Changes

- ac62a6a: feat: add universal rpc() method to AgentX interface

  Add ax.rpc(method, params) as a transport-agnostic JSON-RPC entry point
  that works across all modes (Local, Remote, Builder). Enables custom
  transport scenarios like Cloudflare Workers/DO without requiring internal APIs.

## 2.0.5

### Patch Changes

- b867690: fix: await assistant message persistence in receive() and add image.getMessages API

  - runtime.receive() now awaits all pending message persists before returning,
    ensuring assistant messages are fully written in serverless environments
  - Added image.getMessages(imageId) to ImageNamespace for querying message
    history by imageId without requiring a live agentId

## 2.0.4

### Patch Changes

- 7eeeeaa: Fluent builder API and server merge

  - `createAgentX(config?)` returns a builder supporting local, remote (`.connect()`), and server (`.serve()`) modes
  - Namespace properties changed to singular: `container`, `image`, `agent`, `session`, `presentation`
  - Merged `@agentxjs/server` into `agentxjs` — `createServer` and `CommandHandler` now exported from `agentxjs`
  - Removed `@agentxjs/server` package
  - `agentxjs` is now environment-agnostic (no direct dependency on `node-platform` or `mono-driver`)

## 2.0.3

## 2.0.2

### Patch Changes

- cddf2e3: Inject channel server/client via Platform DI. Rename WebSocketFactory → ChannelClientFactory, webSocketFactory → channelClient. Server reads channelServer from Platform instead of importing WebSocketServer directly, enabling non-Node platforms (e.g. Cloudflare DO) to provide their own ChannelServer implementation.

## 2.0.1

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
