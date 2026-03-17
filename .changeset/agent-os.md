---
"@agentxjs/core": minor
"agentxjs": minor
"@agentxjs/node-platform": minor
---

feat!: introduce AgentOS — unified fs + shell for agents

### What changed

- **New `AgentOS`** — unified operating system abstraction combining FileSystem + Shell + Environment
- **5 tools replace 7**: `read`, `write`, `edit`, `sh`, `start` (removed `bash`, `grep`, `glob`, `list`)
- **`sh` replaces `bash`** — shares filesystem with `read`/`write`/`edit`
- **`start` is new** — launch background processes, get pid for lifecycle management
- **`OSProvider`** replaces `WorkspaceProvider` + `BashProvider` on `AgentXPlatform`
- **`LocalOS`** implementation for Node.js (fs/promises + execa)

### Migration

```typescript
// Before
platform.bashProvider
platform.workspaceProvider

// After
platform.osProvider

// Before: 7 tools (read, write, edit, list, grep, glob, bash)
// After:  5 tools (read, write, edit, sh, start)
// grep/glob/list/ps/kill all go through sh tool
```
