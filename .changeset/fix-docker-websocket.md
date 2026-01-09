---
"@agentxjs/portagent": patch
---

fix(portagent): remove hardcoded wsUrl to fix Docker WebSocket connection

Bun compiler inlined `process.env.NODE_ENV !== "production"` as `true` during build, causing wsUrl to always return `ws://localhost:5200/ws` even in production Docker environments. This broke WebSocket connections when accessing from external hosts.

Solution: Remove wsUrl from server response entirely. Frontend now always uses `window.location.host` to construct WebSocket URL. This works for both development (Vite proxy forwards /ws) and production (same origin).
