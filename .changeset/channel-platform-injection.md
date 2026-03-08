---
"@agentxjs/core": patch
"@agentxjs/server": patch
"@agentxjs/node-platform": patch
"agentxjs": patch
---

Inject channel server/client via Platform DI. Rename WebSocketFactory → ChannelClientFactory, webSocketFactory → channelClient. Server reads channelServer from Platform instead of importing WebSocketServer directly, enabling non-Node platforms (e.g. Cloudflare DO) to provide their own ChannelServer implementation.
