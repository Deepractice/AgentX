---
"@agentxjs/persistence": patch
"@agentxjs/types": patch
"@agentxjs/common": patch
"@agentxjs/agent": patch
"@agentxjs/network": patch
"@agentxjs/runtime": patch
"@agentxjs/ui": patch
"agentxjs": patch
---

feat(persistence): add Node.js 22+ compatibility for SQLite driver

The SQLite driver now automatically detects the runtime environment:

- Bun: uses `bun:sqlite` (built-in)
- Node.js 22+: uses `node:sqlite` (built-in)

This fixes the `ERR_UNSUPPORTED_ESM_URL_SCHEME` error when running on Node.js.

Also adds `engines.node >= 22.0.0` constraint to all packages.
