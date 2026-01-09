---
"@agentxjs/runtime": patch
---

fix(runtime): resolve memory leak and timeout issues in ClaudeEffector (#196)

**Memory Leak Fix:**

- Fix `resetState()` to properly terminate Claude subprocess by calling `promptSubject.complete()` and `claudeQuery.interrupt()` before resetting state
- Fix `dispose()` to call `claudeQuery.interrupt()` before cleanup to ensure subprocess termination
- Fix error handling to always call `resetState()` on any error (not just abort errors) to prevent stale state
- Add `AGENTX_ENVIRONMENT=true` environment variable to mark AgentX-spawned processes for debugging

**Timeout Mechanism Fix:**

- Refactor timeout handling to use RxJS `timeout()` operator for request-response correlation
- Add `pendingRequest$` Subject to track active requests and auto-cancel timeout when result is received
- Replace manual `setTimeout/clearTimeout` with RxJS-managed timeout that properly fires even after `send()` returns
- On timeout, call `claudeQuery.interrupt()` and emit timeout error to receptor

Closes #196
