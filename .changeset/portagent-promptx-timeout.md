---
"@agentxjs/portagent": minor
"@agentxjs/runtime": patch
---

feat(portagent): add PromptX MCP server as default agent

**Portagent:**

- Add `defaultAgent.ts` with PromptX MCP server configuration
- Integrate default agent into server startup
- Add `ENABLE_PROMPTX` environment variable to control (default: enabled)
- Update Dockerfile to install `@promptx/cli` globally
- Add multi-stage Dockerfile with `--target local` for development builds

**Runtime:**

- Increase default request timeout from 30s to 10 minutes (600000ms)
- Better support for long-running tool executions and code generation
