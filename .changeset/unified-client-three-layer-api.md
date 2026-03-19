---
"agentxjs": minor
"@agentxjs/core": minor
---

feat!: unified AgentXClient + three-layer API (chat/present/rpc)

- Merge LocalClient and RemoteClient into single AgentXClient
- Three-layer API: ax.chat (high-level), ax.present (UI), ax.rpc() (low-level)
- Remove RuntimeNamespace, ImageNamespace, SessionNamespace, LLMNamespace from public API
- Remove RpcMethod union type — registry is the single source of truth
- Add rpcMethods() for method discovery with descriptions
- All RPC handlers now register with description metadata
- Delete 6 redundant createLocal*/createRemote* namespace factories

BREAKING CHANGE: ax.runtime and ax.provider removed. Use ax.rpc() for low-level operations and ax.present for Presentation.
