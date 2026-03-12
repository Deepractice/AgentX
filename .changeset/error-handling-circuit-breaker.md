---
"@agentxjs/core": minor
"agentxjs": minor
---

Add AgentXError top-level error type, circuit breaker, and onError API

- New `@agentxjs/core/error` module with `AgentXError` class and `CircuitBreaker`
- `AgentXError` is a core-level type (like `AgentXPlatform`) with category, code, recoverability
- Circuit breaker protects against cascading LLM driver failures (5 failures → open → 30s cooldown)
- Message persistence failures now emit `AgentXError` via EventBus instead of being silently swallowed
- New `ax.onError(handler)` top-level API on AgentX interface for structured error handling
