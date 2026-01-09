---
"@agentxjs/runtime": patch
---

fix(runtime): resolve memory leak in ClaudeEffector process cleanup

- Fix `resetState()` to properly terminate Claude subprocess by calling `promptSubject.complete()` and `claudeQuery.interrupt()` before resetting state
- Fix `dispose()` to call `claudeQuery.interrupt()` before cleanup to ensure subprocess termination
- Fix error handling to always call `resetState()` on any error (not just abort errors) to prevent stale state
- Add `AGENTX_ENVIRONMENT=true` environment variable to mark AgentX-spawned processes for debugging

Closes #196
