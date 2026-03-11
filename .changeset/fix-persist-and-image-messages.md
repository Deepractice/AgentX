---
"@agentxjs/core": patch
"agentxjs": patch
---

fix: await assistant message persistence in receive() and add image.getMessages API

- runtime.receive() now awaits all pending message persists before returning,
  ensuring assistant messages are fully written in serverless environments
- Added image.getMessages(imageId) to ImageNamespace for querying message
  history by imageId without requiring a live agentId
