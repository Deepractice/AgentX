---
"agentxjs": major
"@agentxjs/core": major
"@agentxjs/mono-driver": major
"@agentxjs/claude-driver": major
"@agentxjs/devtools": major
---

BREAKING: rename `agentId` to `instanceId` across all public APIs

- `RuntimeAgent.agentId` → `RuntimeAgent.instanceId`
- `CreateAgentOptions.agentId` → `CreateAgentOptions.instanceId`
- `DriverConfigBase.agentId` → `DriverConfigBase.instanceId`
- `AgentXErrorContext.agentId` → `AgentXErrorContext.instanceId`
- `EventContext.agentId` → `EventContext.instanceId`
- All command/container/session event data: `agentId` → `instanceId`
- RPC methods: `agent.*` → `instance.*`
- SDK types: `AgentNamespace` → `InstanceNamespace`, `AgentCreateResponse` → `InstanceCreateResponse`, etc.
- `RuntimeNamespace.agent` → `RuntimeNamespace.instance`
- ID prefix: `agent_` → `inst_`
- `AgentHandle.agentId` → `AgentHandle.instanceId`
