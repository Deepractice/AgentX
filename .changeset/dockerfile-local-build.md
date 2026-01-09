---
"@agentxjs/portagent": patch
---

feat(portagent): add multi-stage Dockerfile with local build support

- Add `--target local` for building with locally compiled binaries (development/testing)
- Add `--target npm` for building from npm registry (production, default)
- Auto-detect architecture (x86_64/aarch64) and select correct binary
- Copy entire dist directory for local builds to include all resources
