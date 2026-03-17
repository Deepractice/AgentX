---
"@agentxjs/core": minor
"agentxjs": minor
"@agentxjs/mono-driver": minor
"@agentxjs/claude-driver": minor
"@agentxjs/devtools": minor
---

refactor!: replace Embodiment + DriverConfig with AgentContext + SendOptions

**BREAKING CHANGE**: Configuration architecture restructured into a 3-layer model.

### What changed

- **Deleted `Embodiment`** — `model`, `systemPrompt`, `mcpServers`, `thinking`, `providerOptions` are now flat fields on `ImageRecord`, `Agent`, and `PrototypeRecord`
- **Deleted `DriverConfigBase` / `DriverConfig`** — replaced by `AgentContext`
- **New `AgentContext`** — the merged configuration object passed from Runtime to Driver
- **New `SendOptions`** — per-request overrides for `model`, `thinking`, `providerOptions`
- **Full-chain `SendOptions`**: `Presentation.send()` → `Session.send()` → `Runtime.receive()` → `Driver.receive()`
- **`CreateDriver` signature**: `(config: AgentContext & TOptions) => Driver`

### Migration

```typescript
// Before
const config: DriverConfig<MonoDriverOptions> = { ... };
imageRecord.embody?.model

// After
const config: AgentContext & MonoDriverOptions = { ... };
imageRecord.model

// Per-request overrides (new!)
await agent.send("Hello", { thinking: "high", model: "claude-opus-4-6" });
await presentation.send("Hello", { thinking: "disabled" });
```
