---
"agentxjs": patch
---

fix: `handle.present()` no longer fails with "Image not found" in remote mode

Root cause: `presentations.ts` passed `instanceId` (formerly `agentId`) to `imageNs.getMessages()` which expects `imageId`. Fixed by switching to `sessionNs.getMessages(instanceId)` which correctly resolves the instance's session internally.
