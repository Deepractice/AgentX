---
"@agentxjs/core": minor
"@agentxjs/node-platform": minor
"agentxjs": minor
---

Add Prototype registry — reusable agent templates

- PrototypeRecord and PrototypeRepository in @agentxjs/core/persistence
- StoragePrototypeRepository in @agentxjs/node-platform
- ax.prototype.* namespace (create/get/list/update/delete)
- RPC methods: prototype.create/get/list/update/delete
- chat.create() accepts prototypeId to inherit prototype config
- Add prototypeId field to ImageRecord for origin tracking
