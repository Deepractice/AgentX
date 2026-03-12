---
"@agentxjs/mono-driver": patch
---

Update RoleX integration to v1.5.0-dev Builder API

- Migrate from `await createRoleX(platform)` to synchronous `createRoleX({ platform })`
- Use `rx.protocol.tools/instructions` instead of static `protocol` import
- Use embedded `ToolDef.description` instead of `detail()` function
- Route `activate/inspect/survey` through `rx.role.*` namespace
- Route `direct` commands through `rx.rpc()` JSON-RPC 2.0 dispatch
- Update rolexjs and @rolexjs/local-platform to 1.5.0-dev-20260312083443
