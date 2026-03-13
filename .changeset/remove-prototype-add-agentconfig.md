---
"agentxjs": minor
---

BREAKING: remove Prototype registry, replace Embodiment with flat AgentConfig

AgentX is now a pure runtime — receives config, starts agents, manages sessions.
Prototype/template management moves to RoleX.

- Remove `PrototypeNamespace`, `PrototypeCreateResponse/GetResponse/ListResponse/UpdateResponse` types
- Delete `prototypes.ts` namespace implementation
- Remove prototype RPC handlers from CommandHandler
- Remove `prototype` from `RuntimeNamespace` and `AgentX` interface
- Replace `Embodiment` wrapper with flat `AgentConfig` type (model, systemPrompt, mcpServers, contextId, name, description, customData)
- `ChatNamespace.create()` now accepts `AgentConfig` directly (no more `prototypeId` or `embody` wrapper)
- `AgentHandle.update()` uses flat fields instead of `Embodiment`
- `ImageNamespace.create()` accepts `AgentConfig`
