# @agentxjs/persistence

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

- Updated dependencies [8f84a87]
- Updated dependencies [8f84a87]
  - @agentxjs/common@1.9.0
  - @agentxjs/types@1.9.0

## 1.8.1

### Patch Changes

- @agentxjs/types@1.8.1
- @agentxjs/common@1.8.1

## 1.8.0

### Patch Changes

- @agentxjs/types@1.8.0
- @agentxjs/common@1.8.0

## 1.7.0

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

- 363d42d: fix(persistence): pass correct path option to bun-sqlite connector

  Fixed SQLite driver incorrectly passing path as `name` instead of `path` to bun-sqlite connector. This caused db0 to use default `.data/` directory in the current working directory, leading to permission errors in Docker containers.
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

- 07bb2b0: Test OIDC publish workflow
  - @agentxjs/types@1.5.3
  - @agentxjs/common@1.5.3

## 1.5.2

### Patch Changes

- 89b8c9d: Add driver name to persistence creation log for better debugging
  - @agentxjs/types@1.5.2
  - @agentxjs/common@1.5.2
