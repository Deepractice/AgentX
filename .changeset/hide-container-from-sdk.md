---
"agentxjs": minor
"@agentxjs/core": patch
---

BREAKING: hide Container from SDK public API

Container is now an internal concept, auto-managed with DEFAULT_CONTAINER_ID.

- Remove `containerId` param from `image.create()`, `prototype.create()`, `llm.create()`
- Remove `containerId` param from `image.list()`, `prototype.list()`, `llm.list()`, `instance.list()`, `llm.getDefault()`
- Delete `ContainerNamespace`, `ContainerInfo`, `ContainerCreateResponse/GetResponse/ListResponse` types
- Delete `containers.ts` namespace implementation
- Remove container RPC handlers from CommandHandler
- Add `DEFAULT_CONTAINER_ID` constant in `@agentxjs/core/container`
- All namespace implementations use DEFAULT_CONTAINER_ID internally
