# @agentxjs/node-platform

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

- bee5231: feat(workspace): add Workspace abstraction with file operations, watcher, and Presentation integration

  Each agent now gets an isolated workspace directory (auto-assigned workspaceId). Workspace tools (read/write/edit/grep/glob/list) are automatically injected when a workspace is available. File tree changes are pushed to PresentationState in real-time via fs.watch. Consumers can operate on the workspace through `presentation.workspace.read/write/list`.

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

## 2.8.0

### Patch Changes

- Updated dependencies [724e53d]
  - @agentxjs/core@2.8.0

## 2.7.0

### Patch Changes

- Updated dependencies [f3f9686]
  - @agentxjs/core@2.7.0

## 2.6.1

### Patch Changes

- @agentxjs/core@2.6.1

## 2.6.0

### Minor Changes

- e1b44f7: Add Prototype registry — reusable agent templates

  - PrototypeRecord and PrototypeRepository in @agentxjs/core/persistence
  - StoragePrototypeRepository in @agentxjs/node-platform
  - ax.prototype.\* namespace (create/get/list/update/delete)
  - RPC methods: prototype.create/get/list/update/delete
  - chat.create() accepts prototypeId to inherit prototype config
  - Add prototypeId field to ImageRecord for origin tracking

### Patch Changes

- Updated dependencies [e1b44f7]
  - @agentxjs/core@2.6.0

## 2.5.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [266840a]
- Updated dependencies [37a0a42]
  - @agentxjs/core@2.5.0

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

- cddf2e3: Inject channel server/client via Platform DI. Rename WebSocketFactory → ChannelClientFactory, webSocketFactory → channelClient. Server reads channelServer from Platform instead of importing WebSocketServer directly, enabling non-Node platforms (e.g. Cloudflare DO) to provide their own ChannelServer implementation.
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
