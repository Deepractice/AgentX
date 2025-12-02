# Contributing to AgentX

Thank you for your interest in contributing to AgentX! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (we use pnpm workspaces)
- **Git**

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/AgentX.git
cd AgentX

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Verify setup
pnpm typecheck
```

## Development Workflow

### Running Development Mode

```bash
# Start all packages in dev mode
pnpm dev

# Start specific package
pnpm dev --filter=@deepractice-ai/agentx-ui
```

### Building

```bash
# Build all packages (respects dependency order)
pnpm build

# Build specific package
pnpm build --filter=@deepractice-ai/agentx-agent
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter=@deepractice-ai/agentx-engine
```

### Code Quality

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

## Code Style

### Language

- Use **English** for all code comments, logs, error messages, and documentation.

### Naming Conventions

| Type       | Convention                | Example                           |
| ---------- | ------------------------- | --------------------------------- |
| Classes    | PascalCase with suffix    | `ClaudeDriver`, `SessionManager`  |
| Interfaces | PascalCase, no `I` prefix | `Agent`, `Session`                |
| Events     | snake_case                | `text_delta`, `assistant_message` |
| Functions  | camelCase with verb       | `createAgent`, `buildMessage`     |
| Files      | PascalCase for classes    | `AgentInstance.ts`, `Session.ts`  |

### Class Suffixes

- `*Driver` - Message processors (e.g., `ClaudeDriver`)
- `*Manager` - Lifecycle managers (e.g., `SessionManager`)
- `*Repository` - Data persistence (e.g., `SQLiteRepository`)
- `*Container` - Collection managers (e.g., `MemoryAgentContainer`)

### File Organization

- One type per file
- Feature-based directories
- Barrel exports via `index.ts`

### Logging

Always use the logger facade:

```typescript
import { createLogger } from "@deepractice-ai/agentx-common";

const logger = createLogger("engine/AgentEngine");
logger.debug("Processing event", { agentId, eventType });
```

Never use direct `console.*` calls (except in tests and Storybook stories).

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Code style (formatting, semicolons, etc.)               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance tasks                                       |

### Scope

Use package name without prefix:

- `types`, `common`, `engine`, `agent`, `agentx`, `node`, `ui`

### Examples

```bash
feat(engine): add turn tracking processor
fix(node): handle connection timeout in ClaudeDriver
docs: update README with new API examples
refactor(agent): simplify event subscription logic
```

## Changeset

We use [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Changeset

Before creating a PR, add a changeset file:

```bash
# Create .changeset/your-change-name.md manually:
```

```markdown
---
"@deepractice-ai/agentx-engine": minor
"@deepractice-ai/agentx-agent": patch
---

Add turn tracking processor to engine
```

### Version Types

| Type    | When to use                        |
| ------- | ---------------------------------- |
| `major` | Breaking changes                   |
| `minor` | New features (backward compatible) |
| `patch` | Bug fixes                          |

## Pull Request Process

### Branch Naming

```
type/short-description
```

Examples:

- `feat/turn-tracking`
- `fix/connection-timeout`
- `docs/api-examples`

### PR Checklist

Before submitting:

- [ ] Code compiles (`pnpm build`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)
- [ ] Changeset added (if applicable)
- [ ] Documentation updated (if applicable)

### PR Title

Use the same format as commits:

```
feat(engine): add turn tracking processor
```

### Review Process

1. Create PR against `main` branch
2. Wait for CI checks to pass
3. Request review from maintainers
4. Address feedback
5. Squash and merge

## Issue Guidelines

### Bug Reports

Please include:

- AgentX version
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages / logs

### Feature Requests

Please include:

- Use case description
- Proposed solution (if any)
- Alternatives considered

## Architecture Notes

When contributing, keep these principles in mind:

1. **Docker-style Lifecycle**: Definition → Image → Session → Agent
2. **4-Layer Events**: Stream → State → Message → Turn
3. **Mealy Machines**: "State is means, output is goal"
4. **Isomorphic**: Same API for Node.js and Browser
5. **Stream-Only SSE**: Server forwards Stream events only

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## Questions?

- Open a [GitHub Issue](https://github.com/Deepractice/AgentX/issues)
- Check existing issues and discussions

Thank you for contributing!
