---
"@agentxjs/core": minor
"agentxjs": minor
---

refactor!: remove workspace abstraction — OS is the only abstraction

- `ImageRecord.workspaceId` → `osId`
- `PresentationWorkspace` → `PresentationOS`
- `WorkspaceState` → `OSState`
- `pres.workspace` → `pres.os`
- RPC `workspace.read/list/write` → `os.read/list/write`
- Tool descriptions no longer mention "workspace root"
