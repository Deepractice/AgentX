---
"agentxjs": minor
---

Add real-time metrics to PresentationState for status bar rendering

`PresentationState.metrics` now includes:
- `turnStartedAt`: timestamp when the current turn started (null when idle)
- `inputTokens`: input tokens consumed in the current turn
- `outputTokens`: output tokens generated in the current turn

Metrics reset at each turn start and accumulate during streaming. Frontend can render a Claude Code-style status bar: `● responding 3.2s ↑1,234 ↓5,678`
