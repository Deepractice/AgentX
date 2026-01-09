# @agentxjs/types

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
