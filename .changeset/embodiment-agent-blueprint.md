---
"@agentxjs/core": minor
"agentxjs": minor
---

Introduce Embodiment and Agent blueprint types

Core:
- Add Embodiment type: runtime config (model, systemPrompt, mcpServers)
- Add Agent blueprint type: serializable agent definition (name, contextId, embody)
- ImageRecord: move systemPrompt/mcpServers into embody, add model support
- ImageCreateConfig extends Agent — blueprint is portable, config adds containerId
- Runtime resolves config from embody; image-level model overrides container default

SDK (agentxjs):
- Sync ImageRecord with contextId and embody fields
- ImageNamespace.create/update accept contextId and embody
- CommandHandler: embody merge on update (partial, not replace)
- Export Embodiment type
