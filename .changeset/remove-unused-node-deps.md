---
"agentxjs": patch
---

fix: remove unused ws and reconnecting-websocket dependencies

These Node.js-only packages were never imported in agentxjs source code
(they belong in @agentxjs/node-platform). Their presence caused bundlers
like Turbopack/webpack to pull Node.js dependencies into browser builds,
even with dynamic imports.
