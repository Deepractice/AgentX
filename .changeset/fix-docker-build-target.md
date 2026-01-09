---
"@agentxjs/portagent": patch
---

Fix Docker build in CI by specifying npm target

Fix Docker build failure in GitHub Actions post-release workflow. The Dockerfile has two stages (npm and local), but the workflow was building the last stage (local) by default, which requires a local `dist` directory that doesn't exist in CI.

**Solution**: Explicitly specify `target: npm` in the Docker build action to use the production stage that installs from NPM registry.

**Technical Details**:

- Dockerfile has `npm` stage (line 57-72): installs from NPM (production)
- Dockerfile has `local` stage (line 77-100): uses local dist (development)
- Without `target` specified, Docker builds the last stage by default
- CI workflow now explicitly uses `npm` stage for production builds
