---
"@agentxjs/core": minor
"agentxjs": minor
---

feat!: define RpcMethod as union type — single source of truth for all RPC methods

### What changed

- `RpcMethod` changed from `string` to a string literal union of all 25 valid methods
- Handler registration and client calls now type-checked at compile time
- Fixed: RemoteClient called `workspace.read/write/list` but handlers registered `os.read/write/list`

### Methods defined

- `image.*` (8): create, get, list, delete, run, stop, update, messages
- `instance.*` (5): get, list, destroy, destroyAll, interrupt
- `message.*` (1): send
- `runtime.*` (1): rewind
- `llm.*` (6): create, get, list, update, delete, default
- `os.*` (3): read, write, list
