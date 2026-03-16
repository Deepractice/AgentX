---
"@agentxjs/core": minor
"@agentxjs/node-platform": minor
"agentxjs": minor
---

feat(workspace): add Workspace abstraction with file operations, watcher, and Presentation integration

Each agent now gets an isolated workspace directory (auto-assigned workspaceId). Workspace tools (read/write/edit/grep/glob/list) are automatically injected when a workspace is available. File tree changes are pushed to PresentationState in real-time via fs.watch. Consumers can operate on the workspace through `presentation.workspace.read/write/list`.
