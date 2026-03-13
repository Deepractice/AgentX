---
"@agentxjs/core": minor
"agentxjs": minor
---

Introduce Embodiment, Agent blueprint, and AgentHandle

Core:
- Add Embodiment type: runtime config (model, systemPrompt, mcpServers)
- Add Agent blueprint type: serializable agent definition (name, contextId, embody)
- ImageRecord: move systemPrompt/mcpServers into embody, add model support
- ImageCreateConfig extends Agent — blueprint is portable, config adds containerId
- Runtime resolves config from embody; image-level model overrides container default

SDK (agentxjs):
- New top-level Agent API: ax.create() returns AgentHandle
- AgentHandle: send(), interrupt(), history(), present(), update(), delete()
- ax.list() and ax.get() for agent CRUD
- Instance namespace (ax.instance.*) for low-level subsystem access
- Provider namespace (ax.provider.*) for LLM provider management
- Presentation namespace renamed to present
- Export AgentHandle, InstanceNamespace, Embodiment types
