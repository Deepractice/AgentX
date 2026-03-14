---
"@agentxjs/core": patch
"@agentxjs/mono-driver": patch
"agentxjs": patch
---

feat: media resolver, file upload support, and connection pool

- Add `@agentxjs/core/media` module with MediaResolver and strategies (passthrough, textExtract)
- MonoDriver: resolve file parts per provider capabilities before sending to LLM
- MonoDriver: unsupported file types throw UnsupportedMediaTypeError with clear message
- agentxjs: connection pool with refCount for React 18+ Strict Mode compatibility
