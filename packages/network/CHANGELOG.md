# @agentxjs/network

## 1.8.1

### Patch Changes

- @agentxjs/types@1.8.1
- @agentxjs/common@1.8.1

## 1.8.0

### Patch Changes

- 0a309bf: refactor(ui): migrate from custom elements to shadcn/ui components
  - Replace custom Button, Input, Badge, Popover, ScrollArea with shadcn/ui equivalents
  - Add new shadcn components: Dialog, Tabs, Sonner (toast)
  - Update theme to Blue color scheme from shadcn themes
  - Add conversation rename feature with Dialog component in AgentList
  - Add edit button in ListPane for triggering rename
  - Fix hardcoded text-black in MarkdownText component
  - Fix Storybook react-docgen compatibility with Radix UI

  refactor(portagent): fix WebSocket connection in development mode
  - Upgrade Vite from v6 to v7.3.1
  - Work around Vite WebSocket proxy bug by connecting directly to backend in dev mode
  - Use import.meta.env.DEV to detect development environment

  refactor(network): add debug logging for WebSocket client
  - @agentxjs/types@1.8.0
  - @agentxjs/common@1.8.0

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

### Patch Changes

- Updated dependencies [09b990b]
  - @agentxjs/types@1.7.0
  - @agentxjs/common@1.7.0

## 1.6.0

### Patch Changes

- @agentxjs/types@1.6.0
- @agentxjs/common@1.6.0

## 1.5.11

### Patch Changes

- cf039bb: feat(persistence): add Node.js 22+ compatibility for SQLite driver

  The SQLite driver now automatically detects the runtime environment:
  - Bun: uses `bun:sqlite` (built-in)
  - Node.js 22+: uses `node:sqlite` (built-in)

  This fixes the `ERR_UNSUPPORTED_ESM_URL_SCHEME` error when running on Node.js.

  Also adds `engines.node >= 22.0.0` constraint to all packages.

- Updated dependencies [cf039bb]
  - @agentxjs/types@1.5.11
  - @agentxjs/common@1.5.11

## 1.5.10

### Patch Changes

- @agentxjs/types@1.5.10
- @agentxjs/common@1.5.10

## 1.5.9

### Patch Changes

- @agentxjs/types@1.5.9
- @agentxjs/common@1.5.9

## 1.5.8

### Patch Changes

- @agentxjs/types@1.5.8
- @agentxjs/common@1.5.8

## 1.5.7

### Patch Changes

- @agentxjs/types@1.5.7
- @agentxjs/common@1.5.7

## 1.5.6

### Patch Changes

- Updated dependencies [cc51adb]
  - @agentxjs/common@1.5.6
  - @agentxjs/types@1.5.6

## 1.5.5

### Patch Changes

- Updated dependencies [6d6df00]
  - @agentxjs/common@1.5.5
  - @agentxjs/types@1.5.5

## 1.5.4

### Patch Changes

- Updated dependencies [b15f05a]
  - @agentxjs/common@1.5.4
  - @agentxjs/types@1.5.4

## 1.5.3

### Patch Changes

- @agentxjs/types@1.5.3
- @agentxjs/common@1.5.3

## 1.5.2

### Patch Changes

- @agentxjs/types@1.5.2
- @agentxjs/common@1.5.2

## 1.5.1

### Patch Changes

- @agentxjs/types@1.5.1
- @agentxjs/common@1.5.1

## 1.5.0

### Patch Changes

- @agentxjs/types@1.5.0
- @agentxjs/common@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [38217f0]
  - @agentxjs/types@1.4.0
  - @agentxjs/common@1.4.0

## 1.3.0

### Patch Changes

- @agentxjs/types@1.3.0
- @agentxjs/common@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [884eb6a]
  - @agentxjs/types@1.2.0
  - @agentxjs/common@1.2.0

## 1.1.4

### Patch Changes

- @agentxjs/types@1.1.4
- @agentxjs/common@1.1.4

## 1.1.3

### Patch Changes

- 2068a66: Fix workspace: protocol in published packages
  - @agentxjs/types@1.1.3
  - @agentxjs/common@1.1.3

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

### Patch Changes

- Updated dependencies [4043daa]
  - @agentxjs/types@0.2.0
  - @agentxjs/common@0.1.1
