---
"@agentxjs/portagent": patch
---

Replace pino with LogTape for bun --compile compatibility

- Remove pino and pino-pretty dependencies (worker threads incompatible with bun --compile)
- Add @logtape/logtape and @logtape/file (zero dependencies, native Bun support)
- Rewrite LoggerFactory using LogTape with rotating file sink
- Fix npm publish pattern: use root directory publishing with prepublishOnly
