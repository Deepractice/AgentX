---
"agentxjs": patch
"@agentxjs/core": patch
"@agentxjs/node-platform": patch
"@agentxjs/mono-driver": patch
"@agentxjs/claude-driver": patch
"@agentxjs/devtools": patch
---

Fluent builder API and server merge

- `createAgentX(config?)` returns a builder supporting local, remote (`.connect()`), and server (`.serve()`) modes
- Namespace properties changed to singular: `container`, `image`, `agent`, `session`, `presentation`
- Merged `@agentxjs/server` into `agentxjs` — `createServer` and `CommandHandler` now exported from `agentxjs`
- Removed `@agentxjs/server` package
- `agentxjs` is now environment-agnostic (no direct dependency on `node-platform` or `mono-driver`)
