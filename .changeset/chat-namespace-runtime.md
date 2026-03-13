---
"agentxjs": minor
---

Restructure SDK namespaces: chat, runtime, provider

- Add ChatNamespace: ax.chat.create/list/get for conversation management
- Rename instance → runtime (ax.runtime.*)
- Top-level API is now clearly layered:
  - ax.chat.* — conversations (create → AgentHandle)
  - ax.provider.* — LLM provider config
  - ax.runtime.* — low-level subsystems (image, agent, session, container)
- Export ChatNamespace, RuntimeNamespace types
- Update all READMEs with new API architecture
