# AgentX Documentation

The single source of truth for AgentX. All documentation is maintained in Markdown format and can be rendered by any framework.

## Structure

```
docs/
├── getting-started/     # Quick Start (5-10 minutes)
│   ├── installation.md  # Installation Guide
│   ├── quickstart.md    # Quick Start
│   └── first-agent.md   # Create Your First Agent
│
├── concepts/            # Core Concepts (Understanding)
│   ├── overview.md      # Architecture Overview
│   ├── event-system.md  # Four-Layer Event System
│   ├── lifecycle.md     # Lifecycle Management
│   └── mealy-machine.md # Mealy Machine Pattern
│
├── guides/              # Guides (Practical)
│   ├── local-remote.md  # Local/Remote Modes
│   ├── events.md        # Event Subscription
│   ├── sessions.md      # Session Management
│   ├── tools.md         # MCP Tool Integration
│   └── storage.md       # Storage Drivers
│
├── api/                 # API Reference
│   ├── agentx.md        # AgentX High-Level API
│   ├── events.md        # Event Types Reference
│   ├── agent.md         # Agent API
│   └── runtime.md       # Runtime API
│
├── packages/            # Package Documentation
│   ├── types.md         # @agentxjs/types
│   ├── engine.md        # @agentxjs/engine
│   ├── agent.md         # @agentxjs/agent
│   ├── node-runtime.md  # @agentxjs/node-runtime
│   └── ui.md            # @agentxjs/ui
│
└── examples/            # Examples
    ├── chat-cli.md      # CLI Chat Application
    ├── chat-web.md      # Web Chat Application
    └── tool-use.md      # Tool Usage Examples
```

## Principles

1. **Single Source of Truth** - This documentation is the authoritative reference
2. **Code as Documentation** - All examples must be runnable
3. **Progressive Learning** - From beginner to advanced learning path
4. **Type-Safe** - TypeScript-first with full type definitions

## Learning Paths

### Beginner Path
1. `getting-started/installation.md` - Installation
2. `getting-started/quickstart.md` - 5-minute quick start
3. `concepts/overview.md` - Understand the architecture

### Developer Path
1. `concepts/event-system.md` - Understand event system
2. `guides/events.md` - Event subscription in practice
3. `api/agentx.md` - API reference

### Contributor Path
1. `concepts/mealy-machine.md` - Understand core patterns
2. `packages/*.md` - Detailed package documentation
