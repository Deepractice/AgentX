---
"@agentxjs/ui": minor
"@agentxjs/portagent": patch
"@agentxjs/network": patch
---

refactor(ui): migrate from custom elements to shadcn/ui components

- Replace custom Button, Input, Badge, Popover, ScrollArea with shadcn/ui equivalents
- Add new shadcn components: Dialog, Tabs, Sonner (toast)
- Update theme to Blue color scheme from shadcn themes
- Add conversation rename feature with Dialog component in AgentList
- Add edit button in ListPane for triggering rename
- Fix hardcoded text-black in MarkdownText component
- Fix Storybook react-docgen compatibility with Radix UI

refactor(portagent): fix WebSocket connection in development mode

- Upgrade Vite from v6 to v7.3.1
- Work around Vite WebSocket proxy bug by connecting directly to backend in dev mode
- Use import.meta.env.DEV to detect development environment

refactor(network): add debug logging for WebSocket client
