# Issue #044: Tool Protocol Positioning - From ToolX to deepractice Tool Protocol

**Status**: Proposed
**Priority**: High
**Created**: 2025-12-29
**Related**: PromptX ToolX

---

## Background

ToolX is the current tool system in PromptX ecosystem. With Anthropic's Skill becoming an industry trend, we need to clarify our positioning and naming strategy.

### Current Situation

- Anthropic's **Skill** is becoming a de facto standard for AI capability extension
- ToolX provides similar functionality but with different design philosophy
- Naming confusion: Should we follow "Skill" or keep "ToolX"?

---

## Analysis

### ToolX vs Anthropic Skill - Essential Differences

| Dimension   | Anthropic Skill               | ToolX (Current)         |
| ----------- | ----------------------------- | ----------------------- |
| Perspective | Human-centric                 | AI-centric              |
| Invocation  | Human calls via slash command | AI autonomously selects |
| Philosophy  | "Skills human teaches AI"     | "Equipment AI owns"     |
| Interaction | `/commit`, `/review-pr`       | Transparent to user     |
| Binding     | Claude ecosystem only         | Platform independent    |

### The "Programmer Thinking" Trap

Skill paradigm:

```
Human learns commands → Human invokes skill → AI executes
```

This is still "human adapts to machine" - just with AI as the new machine.

ToolX paradigm:

```
Human expresses intent → AI selects tools → Task completed
```

Tools are transparent to users. Users don't need to know ToolX exists.

### Core Differentiation: Bridge Pattern

What Skill doesn't have:

```
Skill: Direct call → Success or failure
ToolX: Bridge isolation → real/mock dual implementation → dry-run validation
```

This solves engineering quality problems:

- Test without real credentials
- Graceful degradation when external services fail
- More reliable AI tool invocation

---

## Decision

### 1. Rename: ToolX → Tool

Drop the "X" suffix. It implied "we're still exploring". Now we're clear about our direction.

| Before           | After           |
| ---------------- | --------------- |
| ToolX            | Tool            |
| "Tool extension" | "Tool Protocol" |
| Follower stance  | Definer stance  |

### 2. Position as deepractice Tool Protocol

Align with existing deepractice agent protocol:

```
deepractice/
├── agent protocol  — Defines AI Agent standards
├── tool protocol   — Defines AI Tool standards
└── ...
```

### 3. URI Scheme

- `@agent://` — Agent Protocol
- `@tool://` — Tool Protocol

Simple, symmetric, self-consistent.

---

## Strategic Value

### Why Not Follow "Skill"?

1. **Following naming = admitting we're followers** — Strategically unfavorable
2. **Skill is human-given ability, Tool is AI's own equipment** — Essential difference
3. **Platform independence** — Not locked to any AI vendor

### Tool Protocol's Unique Value

1. **Platform Independence** — Works across any AI platform
2. **Engineering Quality** — Bridge pattern ensures reliable AI invocation
3. **Cognitive Awareness** — Considers return data impact on AI context
4. **Closed-loop Ecosystem** — More suitable for regular users, not just programmers

---

## External Messaging

> "deepractice Tool Protocol — The tool protocol for AI, enabling AI to autonomously select and use tools."

No need to explain "why ToolX", no need to compare with Skill. **We define our own thing.**

---

## Implementation

### Phase 1: Naming Update

- [ ] Rename ToolX to Tool in PromptX codebase
- [ ] Update `tool://` URI scheme documentation
- [ ] Update all references from "ToolX" to "Tool"

### Phase 2: Documentation

- [ ] Write Tool Protocol specification
- [ ] Document Bridge pattern as core differentiator
- [ ] Create comparison guide (Tool vs Skill) for technical audience

### Phase 3: Integration

- [ ] Align with AgentX packages structure
- [ ] Consider `@agentxjs/tool` package if needed
- [ ] Ensure consistent naming across deepractice ecosystem

---

## Key Takeaway

> "Skill is the platform's hand, Tool is AI's equipment. They don't conflict."

We chose the harder but more correct path: **Making complex things simple for users, not making simple things easier for programmers.**
