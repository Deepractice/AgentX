# CLAUDE.md

## The Iron Law: BDD First

**Before writing ANY code, read the BDD directory.**

```text
project/bdd/journeys/  ← Start here
```

Features are living documentation:

- **Scenario exists** → Implement according to it
- **No scenario** → Write the feature first, then code
- **Unsure if allowed** → Check if feature covers it

**Never allowed**: Skip BDD and write code directly.

---

## BDD Directory Structure

Each project has its own `bdd/` directory:

```text
apps/portagent/bdd/           # Web App
├── journeys/contributor/     # Building portagent
├── journeys/user/            # Using portagent
└── steps/

packages/agentx/bdd/          # SDK
├── journeys/developer/       # Using SDK
└── steps/

bdd/                          # Monorepo
├── journeys/maintainer/      # Release, CI, governance
└── fixtures/                 # Shared VCR recordings
```

**Only journeys matter.** No journey = not important.

---

## Development Workflow

### New Feature

```text
1. Write .feature file
2. Write .steps.ts
3. Run tests → fail
4. Implement code
5. Tests pass
6. Commit
```

### Bug Fix

```text
1. Write .feature to reproduce (@bug @wip)
2. Run → fail
3. Fix code
4. Tests pass
```

### Find Code

**Read the feature file.** Steps point to implementation.

---

## Running Tests

```bash
cd apps/portagent && bun run bdd
cd packages/agentx && bun run bdd

# Specific tags
bun run bdd --tags @developer
bun run bdd --tags @contributor
```

---

## Scenario Types

### Functional Scenarios (Runtime)

Test actual behavior with browser/server:

```gherkin
Scenario: Homepage renders
  Given the portagent dev server is running
  When I visit the homepage
  Then I should see "Portagent" in the page title
```

### Verification Scenarios (Static)

Verify files/config exist - no runtime needed:

```gherkin
Scenario: Next.js is configured
  Given the portagent project
  Then package.json should have "next" dependency
  And "app/layout.tsx" should exist
```

**Principle**: If it can be verified by checking files, do that. Simpler, faster, still documents the requirement.

---

## Feature Format

```gherkin
@journey @developer
Feature: First Conversation
  A developer wants to create an agent and chat.

  Scenario: Create agent and chat locally
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "Assistant" in "my-app" with prompt "You are helpful"
    And I run the image as an agent
    When I send message "Hello"
    Then I should receive a non-empty reply
```

---

## Shared Tools

```typescript
import {
  createCucumberConfig,
  paths,
  launchBrowser,
  startDevServer,
} from "@agentxjs/devtools/bdd";
```

---

## Commands

```bash
bun install
bun build
bun dev
bun dev server
```

---

## Environment

```bash
ANTHROPIC_API_KEY
DEEPRACTICE_API_KEY
DEEPRACTICE_BASE_URL
DEEPRACTICE_MODEL
```

---

## Parallel Workflow

**Key Principle: Writer of tests ≠ Writer of implementation**

This ensures tests represent requirements, not implementation details.

```text
┌─────────────────────────────────────────┐
│  Main Agent (with User) - QA Role       │
│  1. Discuss requirements                │
│  2. Draw ASCII design                   │
│  3. Write .feature file (spec)          │
│  4. Write .steps.ts (test code)         │
│  5. Run tests → all fail (red)          │
│  6. Spawn Sub Agent (bg)                │
│  7. Continue next feature discussion    │
└─────────────────────────────────────────┘
         ↓ (parallel)
┌─────────────────────────────────────────┐
│  Sub Agent (background) - Dev Role      │
│  1. Read feature + steps (the spec)     │
│  2. Implement code only                 │
│  3. Run tests → all pass (green)        │
│  4. Report result                       │
└─────────────────────────────────────────┘
```

**Why this split?**

- Main Agent has expectations → writes tests that reflect expectations
- Sub Agent has clear goal → make tests pass
- If tests fail → either implementation wrong or requirements need adjustment
- This is true BDD: outside-in, test-driven

Use `run_in_background: true` when spawning implementation agents.

---

## Session State

When working in BDD-driven mode, end each response with status:

```
「BDD Driving」Next: [what we're doing next]
```

This reminds AI of the current workflow state across turns.

---

## Remember

> **Feature files are the documentation.**
> **Code is just implementation.**
> **No feature = no code.**
