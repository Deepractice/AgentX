---
"agentxjs": patch
---

Fix chat.get() not creating agent instance — agentId was incorrectly set to imageId, causing send/present to fail
