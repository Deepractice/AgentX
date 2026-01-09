---
"@agentxjs/runtime": patch
---

refactor(runtime): extract SDKQueryLifecycle from ClaudeEffector

Extract SDK lifecycle management into a dedicated `SDKQueryLifecycle` class:

- `SDKQueryLifecycle`: Handles SDK query initialization, background listener, interrupt, reset, and dispose
- `ClaudeEffector`: Now focuses on event coordination and timeout management, delegates SDK operations to lifecycle

This separation improves:

- Single responsibility: Each class has a clear purpose
- Testability: SDK lifecycle can be tested independently
- Maintainability: Smaller, focused classes are easier to understand and modify
