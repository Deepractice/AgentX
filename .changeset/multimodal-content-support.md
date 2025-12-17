---
"@agentxjs/ui": minor
"@agentxjs/types": patch
"agentxjs": patch
"@agentxjs/runtime": patch
---

Add multimodal content support (images and files/PDFs)

- Add ImageBlock and FileBlock components for displaying attachments
- Add MessageContent component for rendering multimodal messages
- Update InputPane with attachment support (paste, drag & drop, file picker)
- Expand drag & drop zone to full Chat area with dark overlay
- Accept all file types by default
- Simplify toolbar to emoji + folder buttons (WeChat style)
- Enable full multimodal content flow from UI to runtime
