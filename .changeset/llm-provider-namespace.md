---
"agentxjs": minor
"@agentxjs/core": minor
"@agentxjs/node-platform": minor
"@agentxjs/mono-driver": minor
"@agentxjs/claude-driver": minor
"@agentxjs/devtools": minor
---

feat: add ax.llm namespace for LLM provider management

- New `ax.llm` namespace with full CRUD API (create, get, list, update, delete, setDefault, getDefault)
- LLM providers separate vendor (who provides) from protocol (API format)
- Driver interface now declares `supportedProtocols` for protocol validation
- `createAgent` validates LLM provider protocol against driver's supported protocols
- BDD framework migrated from @cucumber/cucumber to @deepracticex/bdd (Bun-native)
- Documentation updated across all packages
