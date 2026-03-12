---
"@agentxjs/core": minor
"@agentxjs/mono-driver": minor
"@agentxjs/node-platform": minor
---

Context integration — generic cognitive context layer with built-in RoleX support

Core:
- Add Context interface (instructions, project(), getTools()) and ContextProvider factory
- Add RolexContext implementing Context with dynamic RPC dispatch via toArgs()
- Add RolexContextProvider implementing ContextProvider
- Rename ImageRecord.roleId to contextId
- Add contextProvider to AgentXPlatform
- Runtime auto-creates Context and merges tools when Image has contextId

MonoDriver:
- Three-layer system prompt with XML tags: <system>, <instructions>, <context>
- Migrate from RolexBridge to RolexContext (now in core)

Node Platform:
- Built-in RolexContextProvider by default
- Default paths: ~/.deepractice/agentx and ~/.deepractice/rolex
- Configurable via dataPath and rolexDataPath options
- contextProvider: null to disable
