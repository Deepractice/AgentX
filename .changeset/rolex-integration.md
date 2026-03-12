---
"@agentxjs/mono-driver": minor
"@agentxjs/core": minor
---

feat(mono-driver): integrate RoleX role system

- RolexBridge: converts RoleX tools to AgentX ToolDefinition[], manages role lifecycle, provides Role Context projection
- Three-layer context model: Layer 1 (systemPrompt) + Layer 2 (<role-context> with world instructions + role state) + Layer 3 (messages)
- Role auto-activates on driver.initialize(), context refreshes every receive() call
- All-or-nothing config: provide `rolex: { platform, roleId }` to enable, omit to disable
- DriverConfig flattened: TOptions merged directly into config (no more nested `options`)
- ImageRecord gains `roleId` field (one Image = one Role = one conversation)
- DriverConfigBase gains `customData` for pass-through data from persistence layer
