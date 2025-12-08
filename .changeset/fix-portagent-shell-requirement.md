---
"@agentxjs/portagent": patch
---

fix(portagent): use agent-runtime base image to fix shell requirement

**Problem**: Docker container failed to start with error "No suitable shell found. Claude CLI requires a Posix shell environment. Please ensure you have a valid shell installed and the SHELL environment variable set."

**Solution**: Changed base image from `node:20-alpine` to `deepracticexs/agent-runtime` which includes all required dependencies for Claude Agent SDK including proper Posix shell environment.

**Benefits**:

- Proper shell environment for Claude CLI
- Pre-configured runtime dependencies
- Smaller final image size (shared base layer)
