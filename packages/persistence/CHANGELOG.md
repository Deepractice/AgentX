# @agentxjs/persistence

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
