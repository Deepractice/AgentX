# @agentxjs/portagent

## 0.0.8

### Patch Changes

- Publish @agentxjs/common as public package to fix logger singleton issue across packages
- Updated dependencies
  - agentxjs@0.0.6
  - @agentxjs/node-runtime@0.0.6
  - @agentxjs/ui@0.0.6
  - @agentxjs/types@0.0.6

## 0.0.7

### Patch Changes

- Move dotenv to dependencies to fix ESM/CJS compatibility issue

## 0.0.6

### Patch Changes

- Bundle dotenv into CLI to fix runtime dependency issue

## 0.0.5

### Patch Changes

- Updated dependencies
  - @agentxjs/ui@0.0.5
  - agentxjs@0.0.5
  - @agentxjs/types@0.0.5
  - @agentxjs/node-runtime@0.0.5

## 0.0.4

### Patch Changes

- Bundle internal packages (@agentxjs/agent, @agentxjs/common, @agentxjs/engine) into published packages to fix npm install failures
- b206fda: Initial release of AgentX platform (v0.0.2)
  - agentxjs: Main entry point for AgentX framework
  - @agentxjs/types: TypeScript type definitions
  - @agentxjs/node-runtime: Node.js runtime with Claude SDK, SQLite, FileLogger
  - @agentxjs/ui: React UI components for building AI agent interfaces
  - @agentxjs/portagent: AgentX Portal CLI application

- Updated dependencies
- Updated dependencies [b206fda]
  - agentxjs@0.0.4
  - @agentxjs/node-runtime@0.0.4
  - @agentxjs/types@0.0.4
  - @agentxjs/ui@0.0.4
