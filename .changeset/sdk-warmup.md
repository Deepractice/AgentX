---
"@agentxjs/runtime": minor
"@agentxjs/types": patch
"@agentxjs/ui": patch
---

Add SDK warmup and UI hook tests

**Runtime Package**:

- Add `warmup()` method to `SDKQueryLifecycle` for pre-initializing Claude SDK
- Add `warmup()` method to `ClaudeEffector` and `ClaudeEnvironment`
- RuntimeAgent now calls warmup() on construction (fire-and-forget)
- Reduces first message latency by starting SDK subprocess early

**Types Package**:

- Add optional `warmup()` method to `Environment` interface

**UI Package**:

- Add happy-dom test setup for React hook testing in Bun
- Add useAgent hook tests for event filtering (imageId matching)
