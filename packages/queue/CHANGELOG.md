# @agentxjs/queue

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
  - @agentxjs/common@1.9.0
  - @agentxjs/types@1.9.0
