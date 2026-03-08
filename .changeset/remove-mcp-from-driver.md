---
"@agentxjs/mono-driver": patch
---

Remove MCP dependency from MonoDriver for platform-agnostic compatibility. MCP tool discovery will be handled at the Platform level (like BashProvider), not inside the Driver.
