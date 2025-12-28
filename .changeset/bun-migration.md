---
"@agentxjs/portagent": minor
"@agentxjs/runtime": minor
"@agentxjs/ui": minor
"agentxjs": minor
---

Migrate from pnpm to Bun as package manager and runtime

- Replace pnpm with Bun for package management and script execution
- Update GitHub workflows to use oven-sh/setup-bun
- Fix CSS loading in Vite dev mode with postcss-import resolver
- Unify Tailwind to version 3.x (remove 4.x dependencies)
- Update TypeScript config: moduleResolution "bundler", add bun-types
- Support external DOTENV_CONFIG_PATH injection for dev environment
