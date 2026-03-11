---
"agentxjs": minor
"@agentxjs/core": minor
---

feat: add universal rpc() method to AgentX interface

Add ax.rpc(method, params) as a transport-agnostic JSON-RPC entry point
that works across all modes (Local, Remote, Builder). Enables custom
transport scenarios like Cloudflare Workers/DO without requiring internal APIs.
