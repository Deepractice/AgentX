---
"@agentxjs/core": minor
"@agentxjs/server": minor
"@agentxjs/node-platform": minor
"agentxjs": minor
---

Inject channel server/client via Platform DI. Rename WebSocketFactory → ChannelClientFactory, webSocketFactory → channelClient. Server reads channelServer from Platform instead of importing WebSocketServer directly, enabling non-Node platforms (e.g. Cloudflare DO) to provide their own ChannelServer implementation.
