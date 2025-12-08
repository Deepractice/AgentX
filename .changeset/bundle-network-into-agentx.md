---
"agentxjs": patch
---

Bundle @agentxjs/network into agentxjs package to fix Docker build

- Bundle @agentxjs/network into agentxjs dist (noExternal)
- Move reconnecting-websocket and ws to runtime dependencies
- Fix Docker build error where @agentxjs/network was not published to npm

No API changes for users - the fix is transparent.
