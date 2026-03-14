---
"@agentxjs/mono-driver": patch
---

feat: support image and file content parts in MonoDriver

Previously MonoDriver silently dropped non-text content parts (images, files),
converting them to `[object Object]`. Now correctly maps AgentX `ImagePart` and
`FilePart` to Vercel AI SDK format, enabling file upload support across all
providers.
