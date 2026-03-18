---
"@agentxjs/core": minor
"agentxjs": minor
---

refactor!: rename contextId to roleId across all types

### What changed

- `Agent.contextId` → `Agent.roleId`
- `ImageRecord.contextId` → `ImageRecord.roleId`
- `PrototypeRecord.contextId` → `PrototypeRecord.roleId`
- `AgentConfig.contextId` → `AgentConfig.roleId`
- `ContextProvider.create(contextId)` → `ContextProvider.create(roleId)`
- All JSDoc updated accordingly

### Why

`contextId` was ambiguous — Context is a broad concept (Layer 2 cognitive context).
What's actually passed is a role identifier (e.g. a RoleX individual ID).
`roleId` makes the semantic intent clear: the ID points to a specific role,
which is one concrete pointer within the Context system.

### Migration

```typescript
// Before
ax.chat.create({ contextId: "aristotle" })

// After
ax.chat.create({ roleId: "aristotle" })
```
