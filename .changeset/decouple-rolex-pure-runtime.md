---
"agentxjs": minor
---

BREAKING: decouple RoleX, pure runtime architecture

- Rename Context interface: `instructions` → `schema`, `getTools()` → `capabilities()`
- Add self-describing `Capability` type (name, description, parameters, execute)
- Remove `rolexjs` dependency from core, mono-driver, node-platform
- Delete built-in RolexContext and RolexContextProvider — moved to `@rolexjs/agentx-context`
- `contextProvider` is now an optional injection in node-platform (no default)
- Delete CLI app — AgentX is SDK-only
- Clean up unused exports (createServer, Embodiment, Prototype types)
