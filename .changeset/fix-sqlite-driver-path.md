---
"@agentxjs/persistence": patch
"@agentxjs/portagent": patch
---

fix(persistence): pass correct path option to bun-sqlite connector

Fixed SQLite driver incorrectly passing path as `name` instead of `path` to bun-sqlite connector. This caused db0 to use default `.data/` directory in the current working directory, leading to permission errors in Docker containers.
