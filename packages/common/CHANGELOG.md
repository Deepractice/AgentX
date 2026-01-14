# @agentxjs/common

## 1.9.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [8f84a87]
- Updated dependencies [8f84a87]
  - @agentxjs/types@1.9.0

## 1.8.1

### Patch Changes

- @agentxjs/types@1.8.1

## 1.8.0

### Patch Changes

- @agentxjs/types@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [09b990b]
  - @agentxjs/types@1.7.0

## 1.6.0

### Patch Changes

- @agentxjs/types@1.6.0

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

## 1.5.10

### Patch Changes

- @agentxjs/types@1.5.10

## 1.5.9

### Patch Changes

- @agentxjs/types@1.5.9

## 1.5.8

### Patch Changes

- @agentxjs/types@1.5.8

## 1.5.7

### Patch Changes

- @agentxjs/types@1.5.7

## 1.5.6

### Patch Changes

- cc51adb: Test complete workflow: version PR + npm publish + workspace replacement + unified release + Docker build
  - @agentxjs/types@1.5.6

## 1.5.5

### Patch Changes

- 6d6df00: Test workflow_call for Docker build after npm publish
  - @agentxjs/types@1.5.5

## 1.5.4

### Patch Changes

- b15f05a: Test unified release workflow with automated tag and GitHub release creation
  - @agentxjs/types@1.5.4

## 1.5.3

### Patch Changes

- @agentxjs/types@1.5.3

## 1.5.2

### Patch Changes

- @agentxjs/types@1.5.2

## 1.5.1

### Patch Changes

- @agentxjs/types@1.5.1

## 1.5.0

### Patch Changes

- @agentxjs/types@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [38217f0]
  - @agentxjs/types@1.4.0

## 1.3.0

### Patch Changes

- @agentxjs/types@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [884eb6a]
  - @agentxjs/types@1.2.0

## 1.1.4

### Patch Changes

- @agentxjs/types@1.1.4

## 1.1.3

### Patch Changes

- @agentxjs/types@1.1.3

## 0.1.1

### Patch Changes

- Updated dependencies [4043daa]
  - @agentxjs/types@0.2.0

## 0.1.0

### Patch Changes

- @agentxjs/types@0.1.0

## 0.0.9

### Patch Changes

- @agentxjs/types@0.0.9

## 0.1.0

### Minor Changes

- Publish @agentxjs/common as public package to fix logger singleton issue across packages

### Patch Changes

- @agentxjs/types@0.0.6

## 0.1.2

### Patch Changes

- @agentxjs/types@0.0.5

## 0.1.1

### Patch Changes

- Updated dependencies [b206fda]
  - @agentxjs/types@0.0.4
