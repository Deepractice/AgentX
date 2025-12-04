# @agentxjs/mirror

Internal package - Peer-based relay node for AgentX chain topology.

## Overview

Mirror enables chain-style event relay between Ecosystem nodes:

```text
Ecosystem <- Mirror <- Mirror <- Browser
```

Each Mirror node can:

- Connect to upstream (Ecosystem or another Mirror)
- Serve downstream (Browser or another Mirror)
- Relay events bidirectionally

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      MirrorEcosystem                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      SystemBus                          ││
│  └────────────────────────┬────────────────────────────────┘│
│            ▲              │              │                  │
│            │              │              ▼                  │
│  ┌─────────┴───────┐      │      ┌───────────────────┐     │
│  │  PeerReceptor   │      │      │   PeerEffector    │     │
│  │  (upstream ->   │      │      │   (-> downstream) │     │
│  │   SystemBus)    │      │      │                   │     │
│  └────────┬────────┘      │      └─────────┬─────────┘     │
│           │               │                │                │
│  ┌────────┴───────────────┴────────────────┴────────┐      │
│  │                      Peer                         │      │
│  │  ┌──────────────┐          ┌───────────────────┐ │      │
│  │  │   Upstream   │          │    Downstream     │ │      │
│  │  │  (as client) │          │   (as server)     │ │      │
│  │  └──────────────┘          └───────────────────┘ │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Event Flow

| Direction | Event Types | Handling |
|-----------|-------------|----------|
| Upstream -> Mirror | `message_start`, `text_delta`, `tool_call`, `tool_result`, `message_stop` | PeerReceptor -> SystemBus -> PeerEffector -> Downstream broadcast |
| Downstream -> Mirror | `user_message`, `interrupt` | PeerEffector -> Upstream |

## Development

```bash
pnpm test         # Run tests
pnpm test:watch   # Watch mode
pnpm build        # Build
pnpm typecheck    # Type check
```
