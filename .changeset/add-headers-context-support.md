---
"agentxjs": minor
"@agentxjs/network": minor
"@agentxjs/types": minor
---

Add headers and context support for remote AgentX connections

This update adds the ability to pass custom authentication headers and business context when creating remote AgentX connections.

**New Features:**

- **Custom Headers**: Pass authentication headers (Authorization, API keys, etc.) when connecting to AgentX server
  - Node.js: Headers sent during WebSocket handshake
  - Browser: Headers sent as first authentication message (WebSocket API limitation)
  - Supports static values, sync functions, and async functions

- **Business Context**: Automatically inject business context (userId, tenantId, permissions, etc.) into all requests
  - Context is merged into the `data` field of every request
  - Request-level context can override global context
  - Supports static values, sync functions, and async functions

**Usage:**

```typescript
import { createAgentX } from "agentxjs";

// Static configuration
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: { Authorization: "Bearer sk-xxx" },
  context: { userId: "123", tenantId: "abc" },
});

// Dynamic configuration (sync)
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
  context: () => ({ userId: getCurrentUser().id }),
});

// Dynamic configuration (async)
const agentx = await createAgentX({
  serverUrl: "ws://localhost:5200",
  headers: async () => ({ Authorization: `Bearer ${await fetchToken()}` }),
  context: async () => ({ userId: await getUserId() }),
});
```

**API Changes:**

- `RemoteConfig` interface: Added optional `headers` and `context` fields
- `ChannelClientOptions` interface: Added optional `headers` field
- `createRemoteAgentX()`: Now accepts full `RemoteConfig` instead of just `serverUrl`

**Related Issue:** Resolves #192
