# @agentxjs/types

## 1.9.0

### Patch Changes

- 8f84a87: Major refactoring of Queue and Network layers with new utilities

  **Queue Package (New Architecture)**:
  - Rewrite with RxJS Subject for in-memory pub/sub
  - Native SQLite persistence (removed db0 dependency)
  - Simplified API: publish/subscribe/ack/getCursor/recover
  - Decoupled from network protocol
  - 13 unit tests

  **Network Package**:
  - Add `sendReliable()` for at-least-once delivery
  - Auto-ACK protocol with onAck callbacks
  - 52 unit tests covering full protocol

  **Common Package**:
  - New `@agentxjs/common/sqlite` - unified SQLite abstraction for Bun/Node.js
  - New `@agentxjs/common/path` - cross-runtime path utilities (getModuleDir, getPackageRoot, etc.)
  - 12 unit tests for path module

  **AgentX Package**:
  - Simplify remote protocol (remove queue\_\* messages)
  - Extract createRemoteAgentX to separate file
  - Fix dispose() order to prevent zombie processes
  - Add shutdown tests (< 2s guaranteed)

  **Breaking Changes**: None (internal refactoring only)

  **Performance**: Reduced code by ~700 lines, improved shutdown reliability

- 8f84a87: Add SDK warmup and UI hook tests

  **Runtime Package**:
  - Add `warmup()` method to `SDKQueryLifecycle` for pre-initializing Claude SDK
  - Add `warmup()` method to `ClaudeEffector` and `ClaudeEnvironment`
  - RuntimeAgent now calls warmup() on construction (fire-and-forget)
  - Reduces first message latency by starting SDK subprocess early

  **Types Package**:
  - Add optional `warmup()` method to `Environment` interface

  **UI Package**:
  - Add happy-dom test setup for React hook testing in Bun
  - Add useAgent hook tests for event filtering (imageId matching)

## 1.8.1

## 1.8.0

## 1.7.0

### Minor Changes

- 09b990b: Add headers and context support for remote AgentX connections

  This update adds the ability to pass custom authentication headers and business context when creating remote AgentX connections.

  **New Features:**
  - **Custom Headers**: Pass authentication headers (Authorization, API keys, etc.) when connecting to AgentX server
    - Node.js: Headers sent during WebSocket handshake
    - Browser: Headers sent as first authentication message (WebSocket API limitation)
    - Supports static values, sync functions, and async functions
  - **Business Context**: Automatically inject business context (userId, tenantId, permissions, etc.) into all requests
    - Context is merged into the `data` field of every request
    - Request-level context can override global context
    - Supports static values, sync functions, and async functions

  **Usage:**

  ```typescript
  import { createAgentX } from "agentxjs";

  // Static configuration
  const agentx = await createAgentX({
    serverUrl: "ws://localhost:5200",
    headers: { Authorization: "Bearer sk-xxx" },
    context: { userId: "123", tenantId: "abc" },
  });

  // Dynamic configuration (sync)
  const agentx = await createAgentX({
    serverUrl: "ws://localhost:5200",
    headers: () => ({ Authorization: `Bearer ${getToken()}` }),
    context: () => ({ userId: getCurrentUser().id }),
  });

  // Dynamic configuration (async)
  const agentx = await createAgentX({
    serverUrl: "ws://localhost:5200",
    headers: async () => ({ Authorization: `Bearer ${await fetchToken()}` }),
    context: async () => ({ userId: await getUserId() }),
  });
  ```

  **API Changes:**
  - `RemoteConfig` interface: Added optional `headers` and `context` fields
  - `ChannelClientOptions` interface: Added optional `headers` field
  - `createRemoteAgentX()`: Now accepts full `RemoteConfig` instead of just `serverUrl`

  **Related Issue:** Resolves #192

## 1.6.0

## 1.5.11

### Patch Changes

- cf039bb: feat(persistence): add Node.js 22+ compatibility for SQLite driver

  The SQLite driver now automatically detects the runtime environment:
  - Bun: uses `bun:sqlite` (built-in)
  - Node.js 22+: uses `node:sqlite` (built-in)

  This fixes the `ERR_UNSUPPORTED_ESM_URL_SCHEME` error when running on Node.js.

  Also adds `engines.node >= 22.0.0` constraint to all packages.

## 1.5.10

## 1.5.9

## 1.5.8

## 1.5.7

## 1.5.6

## 1.5.5

## 1.5.4

## 1.5.3

## 1.5.2

## 1.5.1

## 1.5.0

## 1.4.0

### Patch Changes

- 38217f0: Add multimodal content support (images and files/PDFs)
  - Add ImageBlock and FileBlock components for displaying attachments
  - Add MessageContent component for rendering multimodal messages
  - Update InputPane with attachment support (paste, drag & drop, file picker)
  - Expand drag & drop zone to full Chat area with dark overlay
  - Accept all file types by default
  - Simplify toolbar to emoji + folder buttons (WeChat style)
  - Enable full multimodal content flow from UI to runtime

## 1.3.0

## 1.2.0

### Minor Changes

- 884eb6a: feat: MCP configuration refactor - ImageRecord as single source of truth
  - Add `mcpServers` field to ImageRecord for persistent storage
  - Add `defaultAgent` to LocalConfig for system-level agent defaults
  - RuntimeAgent reads config (name, systemPrompt, mcpServers) from ImageRecord
  - Export McpServerConfig from runtime/internal barrel
  - Dev-server uses stdio transport for MCP servers

## 1.1.4

## 1.1.3

## 0.2.0

### Minor Changes

- 4043daa: **Architecture: Extract network layer + Fix WebSocket connection timeout (#142)**

  ## Problem

  WebSocket connections were timing out after prolonged inactivity (60+ seconds), causing "WebSocket is already in CLOSING or CLOSED state" errors and request timeouts when creating new conversations.

  ## Solution

  ### 1. New Package: @agentxjs/network

  Extracted network layer into a dedicated package with clean abstraction:
  - **Channel Interface** - Transport-agnostic client/server interfaces
  - **WebSocketServer** - Server implementation with built-in heartbeat (30s ping/pong)
  - **WebSocketClient** - Node.js client
  - **BrowserWebSocketClient** - Browser client with auto-reconnect (using `reconnecting-websocket`)

  ### 2. Refactored agentx Package
  - Now depends on `@agentxjs/network` instead of direct WebSocket handling
  - Simplified codebase: removed 200+ lines of WebSocket management code
  - Cleaner separation: business logic vs network transport

  ### 3. Fixed Connection Timeout
  - **Server**: Ping every 30s, terminate on timeout
  - **Browser**: Auto-reconnect with exponential backoff (1-10s, infinite retries)
  - **Logging**: Connection state changes logged for debugging

  ## Benefits

  ✅ **Separation of Concerns** - Network layer isolated from business logic
  ✅ **Reusability** - Channel interfaces can be implemented with HTTP/2, gRPC, etc.
  ✅ **Testability** - Easy to mock Channel for testing
  ✅ **Maintainability** - Network code in one place

  ## Migration

  No breaking changes for users - same API, better internals.

## 0.1.0

## 0.0.9

## 0.0.6

## 0.0.5

## 0.0.4

### Patch Changes

- b206fda: Initial release of AgentX platform (v0.0.2)
  - agentxjs: Main entry point for AgentX framework
  - @agentxjs/types: TypeScript type definitions
  - @agentxjs/node-runtime: Node.js runtime with Claude SDK, SQLite, FileLogger
  - @agentxjs/ui: React UI components for building AI agent interfaces
  - @agentxjs/portagent: AgentX Portal CLI application
