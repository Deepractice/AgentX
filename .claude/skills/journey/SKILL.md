---
name: journey
description: Load BDD journey feature files as project context for a specific role. Use when the user invokes "/journey <role>" where role is maintainer, contributor, or developer. Loads all .feature files from bdd/journeys/<role>/ as living documentation context. Examples - "/journey maintainer" loads project rules (BDD workflow, conventions, testing, environment, release, architecture), "/journey contributor" loads build and setup specs, "/journey developer" loads SDK usage specs.
---

# Journey Context Loader

Load all BDD feature files for a role as working context.

## Usage

Run the loader script with the role argument:

```bash
bun SKILL_DIR/scripts/load-features.ts <role>
```

Roles: `maintainer`, `contributor`, `developer`

## After Loading

- The feature files ARE the documentation. Use them as the source of truth for all project rules and conventions.
- When the user asks about project norms, answer from the loaded features.
- When implementing code, check loaded features for relevant constraints.
