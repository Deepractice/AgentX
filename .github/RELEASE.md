# Release Process

This document describes the automated release workflow for AgentX monorepo using [Changesets](https://github.com/changesets/changesets).

## Overview

```
Feature PR (with changeset) → Merge to main → Version PR created
                                                    ↓
                                            Merge Version PR
                                                    ↓
                                            Publish to npm
                                                    ↓
                                      Create unified release (v1.x.x)
                                                    ↓
                                         Build Docker images
```

## How It Works

### 1. Creating a Changeset

When you make changes that should be released, create a changeset file:

```bash
bunx changeset
```

Or manually create a file in `.changeset/` directory:

```markdown
---
"@agentxjs/package-name": patch
---

Description of your changes
```

**Version bump types:**

- `patch` - Bug fixes, internal improvements
- `minor` - New features, enhancements
- `major` - Breaking changes (avoid if possible)

### 2. Changeset Accumulation

Multiple changesets can accumulate before release:

- Each PR can include its own changeset file
- Changesets are merged into `main` along with code changes
- All pending changesets are combined when creating Version PR

### 3. Automatic Version PR

When commits with changesets are pushed to `main`:

1. `changesets.yml` workflow detects changeset files
2. Automatically creates/updates "Version Packages" PR
3. PR includes:
   - Version bumps in all `package.json` files
   - Updated `CHANGELOG.md` for each package
   - Deletion of consumed changeset files

### 4. Publishing

When the Version PR is merged:

1. Workflow detects no changeset files but unpublished versions
2. Publishes all packages to npm in dependency order
3. Creates unified git tag (`v1.x.x`)
4. Creates GitHub Release (`Release v1.x.x`)
5. Triggers `post.yml` for Docker image build

## Configuration

### Fixed Versioning

All packages use synchronized versions (configured in `.changeset/config.json`):

```json
{
  "fixed": [
    ["agentxjs", "@agentxjs/runtime", "@agentxjs/ui", ...]
  ]
}
```

This means when any package changes, all packages get the same version number.

### Ignored Packages

Development packages are excluded from publishing:

```json
{
  "ignore": ["@agentx/dev-storybook"]
}
```

## Workflows

| Workflow         | Trigger           | Purpose                           |
| ---------------- | ----------------- | --------------------------------- |
| `changesets.yml` | Push to `main`    | Version PR creation & npm publish |
| `post.yml`       | Release published | Docker image build                |
| `ci.yml`         | PR to `main`      | CI checks (lint, typecheck, test) |

## Manual Operations

### Skip Release

If you need to push to `main` without triggering a release, simply don't include a changeset file.

### Force Republish

If a publish fails, you can re-trigger by:

1. Re-running the failed workflow
2. Or creating an empty commit to `main`

### View Pending Changes

Check what changes are pending release:

```bash
bunx changeset status
```

## Troubleshooting

### Version PR Not Created

- Verify changeset files exist in `.changeset/` (not just `README.md`)
- Check `changesets.yml` workflow logs

### Publish Failed

- Check npm token is valid in repository secrets (`NPM_TOKEN`)
- Verify packages have `publishConfig.access: "public"` for scoped packages

### Docker Build Not Triggered

- Ensure unified release was created (check Releases page)
- Verify `post.yml` is listening to `release: published` event

## Related Files

- `.changeset/config.json` - Changesets configuration
- `.github/workflows/changesets.yml` - Release workflow
- `.github/workflows/post.yml` - Post-release workflow (Docker)
