---
"@agentxjs/portagent": patch
---

fix(docker): ensure Docker image installs correct npm package version

- Add VERSION build arg to Dockerfile for explicit version control
- Wait for specific version availability on npm before building
- Pass version via build-args to prevent installing stale cached versions
