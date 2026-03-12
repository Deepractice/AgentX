# Contributing to AgentX

## Prerequisites

- **Bun** 1.3.0+
- **Node.js** 22.0.0+
- **Git**

## Setup

```bash
git clone https://github.com/Deepractice/AgentX.git
cd AgentX
bun install
bun run build
```

Verify everything works:

```bash
bun test bdd/
```

## Project Structure

```
AgentX/
├── packages/        # Publishable library packages
│   ├── core/        # Types, interfaces, base classes
│   ├── agentx/      # Unified SDK (main entry for developers)
│   ├── server/      # WebSocket server
│   ├── mono-driver/ # Multi-provider LLM driver
│   ├── claude-driver/ # Claude-native driver
│   ├── node-platform/ # Node.js runtime (storage, events)
│   └── devtools/    # Testing utilities (BDD tools)
├── apps/            # Deployable applications
│   ├── portagent/   # Web app (Next.js)
│   └── cli/         # Terminal UI
└── bdd/             # Root-level Living Documentation
    └── journeys/    # Feature files organized by role
```

Build order follows the dependency graph (handled automatically by Turbo):

1. `@agentxjs/core`, `@agentxjs/devtools`
2. `@agentxjs/node-platform`, `@agentxjs/claude-driver`, `@agentxjs/mono-driver`
3. `@agentxjs/server`, `agentxjs`
4. `@agentxjs/cli`, `@agentx/portagent`

## Daily Workflow

| Command            | Purpose                               |
| ------------------ | ------------------------------------- |
| `bun dev`          | Start dev environment with hot reload |
| `bun run build`    | Rebuild all packages                  |
| `bun test bdd/`    | Run BDD tests                         |
| `bun run bdd:ui`   | Run UI tests (requires browser)       |
| `bun run bdd:docs` | Run documentation quality tests       |

## BDD-First Workflow

> **Iron Law: No feature = no code.**

Every change starts with a `.feature` file. Follow the 4-step process:

| Step | Action                                    |
| ---- | ----------------------------------------- |
| 1    | Write `.feature` file describing the goal |
| 2    | Write `.steps.ts` with test definitions   |
| 3    | Implement the code                        |
| 4    | Run `bun test bdd/` until all pass        |

### Where to put BDD files

| What you're working on | BDD location           |
| ---------------------- | ---------------------- |
| A specific package     | `packages/<name>/bdd/` |
| A specific app         | `apps/<name>/bdd/`     |
| Monorepo-wide norms    | `bdd/` (root)          |

Each `bdd/` directory has:

- `run.test.ts` — BDD runner entry (uses `@deepracticex/bdd` configure())
- `journeys/` — Feature files organized by role
- `steps/` — Step definitions
- `support/` — World class and hooks

## Environment Variables

| Variable               | Purpose                | Required    |
| ---------------------- | ---------------------- | ----------- |
| `ANTHROPIC_API_KEY`    | Anthropic API access   | Yes         |
| `DEEPRACTICE_API_KEY`  | Deepractice API access | Alternative |
| `DEEPRACTICE_BASE_URL` | Custom API base URL    | No          |
| `DEEPRACTICE_MODEL`    | Override default model | No          |

Tests using VCR can run without an API key (replays recorded fixtures).

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance tasks                                       |

Scope uses package name: `core`, `agentx`, `server`, `mono-driver`, `node-platform`, `claude-driver`, `devtools`, `portagent`, `cli`.

## Changeset

We use [Changesets](https://github.com/changesets/changesets) with fixed versioning — bumping any package bumps all of them.

Before creating a PR with user-facing changes:

```bash
bun changeset
```

Select affected packages, choose bump type (patch/minor/major), and write a summary.

## Pull Request Process

1. Create a feature branch: `feat/short-description` or `fix/short-description`
2. Follow BDD-first workflow (feature file → steps → implementation → tests pass)
3. Add a changeset if applicable
4. Push and create PR against `main`
5. Wait for CI, address feedback, squash and merge

## Code Style

- **English** for all code, comments, and documentation
- **ESM modules** (`"type": "module"`)
- Use `commonxjs/logger` instead of `console.log`
- Use `commonxjs/sqlite` instead of direct SQLite bindings
- See `CLAUDE.md` for full conventions

## Questions?

- Open a [GitHub Issue](https://github.com/Deepractice/AgentX/issues)
