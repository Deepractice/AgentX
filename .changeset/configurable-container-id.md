---
"@agentxjs/core": minor
"agentxjs": minor
"@agentxjs/node-platform": minor
---

feat!: make containerId configurable on AgentXPlatform

### What changed

- `AgentXPlatform.containerId` is now a required field
- All handlers and namespaces read containerId from platform instead of hardcoding `DEFAULT_CONTAINER_ID`
- Remote clients no longer send containerId in RPC params — server uses its own platform config
- `NodePlatformOptions.containerId` added (defaults to "default")

### Why

Different products (monogent, admin playground, etc.) sharing the same Actor DO
can now isolate their data via different container IDs.

### Migration

```typescript
// Before — containerId was always "default"
const platform: AgentXPlatform = {
  containerRepository,
  imageRepository,
  // ...
};

// After — containerId is required
const platform: AgentXPlatform = {
  containerId: "monogent",  // or DEFAULT_CONTAINER_ID for "default"
  containerRepository,
  imageRepository,
  // ...
};
```
