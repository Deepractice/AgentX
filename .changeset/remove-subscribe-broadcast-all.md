---
"agentxjs": minor
"@agentxjs/core": minor
---

Remove subscribe/unsubscribe mechanism — server broadcasts all events to all connections

**Breaking change**: `AgentX.subscribe()` method removed from the interface. This was an internal detail that consumers should not have needed to call directly.

Server now sends all broadcastable events to all connected clients without topic filtering. Client-side Presentation already filters events by instanceId/imageId.

This fixes the bug where page refresh or WebSocket reconnect caused Presentation `onUpdate` to stop firing due to lost session subscriptions.
