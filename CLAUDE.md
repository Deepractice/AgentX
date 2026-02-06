# CLAUDE.md

## Language

Always respond in Chinese.

## The Iron Law: BDD First

> **Feature files are the documentation. Code is just implementation. No feature = no code.**

Before writing ANY code, read `bdd/journeys/`. Details: `bdd/journeys/maintainer/01-bdd-workflow.feature`

## Quick Reference

| What | Where |
|------|-------|
| BDD workflow | `bdd/journeys/maintainer/01-bdd-workflow.feature` |
| Naming & tagging | `bdd/journeys/maintainer/02-conventions.feature` |
| Testing tools | `bdd/journeys/maintainer/03-testing.feature` |
| AI agent workflow | `bdd/journeys/maintainer/04-ai-workflow.feature` |
| Environment & commands | `bdd/journeys/maintainer/05-environment.feature` |
| Release & publishing | `bdd/journeys/maintainer/06-release.feature` |
| Monorepo architecture | `bdd/journeys/maintainer/07-architecture.feature` |
| Adding new packages | `bdd/journeys/maintainer/08-new-package.feature` |
| Package READMEs | `bdd/journeys/contributor/package-readmes.feature` |

## Commands

```bash
bun install && bun build        # Setup
bun run bdd                     # Run tests
bun run bdd:ui                  # Run UI tests
bun run bdd:docs                # Run doc tests
```

## Environment

```bash
ANTHROPIC_API_KEY               # Required for AI features
DEEPRACTICE_API_KEY             # Alternative API key
DEEPRACTICE_BASE_URL            # Custom API base URL
DEEPRACTICE_MODEL               # Override default model
```

## Session State

When in BDD-driven mode, end each response with:

```
「BDD Driving」Next: [what we're doing next]
```
