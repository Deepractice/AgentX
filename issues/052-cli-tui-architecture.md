# CLI Terminal UI Architecture

## Overview

Create `apps/cli` - a Terminal UI (TUI) client for AgentX, referencing OpenCode's UI architecture while implementing our own logic layer.

## Reference Project

**OpenCode** (`temp/opencode`) provides a mature TUI framework:

- Repository: https://github.com/anomalyco/opencode
- License: MIT

## Core Dependencies

| Package          | Version | Description                    |
| ---------------- | ------- | ------------------------------ |
| `@opentui/core`  | 0.1.77  | Terminal UI rendering engine   |
| `@opentui/solid` | 0.1.77  | Solid.js bindings for terminal |
| `solid-js`       | 1.9.10  | Reactive UI framework          |

## UI Components to Reference

### 1. Core Framework

```typescript
// @opentui/solid provides JSX-based terminal components
import { render, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"

render(() => (
  <box width={100} height={50} backgroundColor="#1a1a1a">
    <text fg="#ffffff">Hello Terminal</text>
  </box>
))
```

### 2. Dialog System

Reference: `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx`

```typescript
// Stack-based modal management
const DialogProvider = () => {
  const [store, setStore] = createStore({
    stack: [] as { element: JSX.Element; onClose?: () => void }[],
  });

  // ESC to close, keyboard event handling
  useKeyboard((evt) => {
    if (evt.name === "escape" && store.stack.length > 0) {
      // pop from stack
    }
  });
};
```

### 3. Theme System

Reference: `packages/opencode/src/cli/cmd/tui/context/theme.tsx`

- 35+ built-in themes (JSON format)
- Dark/Light mode support
- Terminal background color detection
- Custom theme loading

Theme colors include:

- Primary, Secondary, Accent
- Error, Warning, Success, Info
- Text, TextMuted
- Background, BackgroundPanel, BackgroundElement
- Border, BorderActive, BorderSubtle
- Diff colors (Added, Removed, Context)
- Markdown colors
- Syntax highlighting colors

### 4. Provider Architecture

Reference: `packages/opencode/src/cli/cmd/tui/app.tsx`

```typescript
// Nested provider pattern
<ExitProvider>
  <ToastProvider>
    <RouteProvider>
      <ThemeProvider>
        <KeybindProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </KeybindProvider>
      </ThemeProvider>
    </RouteProvider>
  </ToastProvider>
</ExitProvider>
```

## Proposed Structure

```
apps/cli/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── app.tsx                 # TUI main component
│   ├── context/
│   │   ├── agentx.tsx          # AgentX SDK provider (our implementation)
│   │   ├── theme.tsx           # Theme provider (reference opencode)
│   │   ├── dialog.tsx          # Dialog provider (reference opencode)
│   │   ├── toast.tsx           # Toast provider (reference opencode)
│   │   ├── keybind.tsx         # Keybind provider (reference opencode)
│   │   ├── route.tsx           # Route provider (reference opencode)
│   │   └── exit.tsx            # Exit handler
│   ├── ui/
│   │   ├── dialog.tsx          # Dialog component
│   │   ├── dialog-select.tsx   # Selection dialog
│   │   ├── toast.tsx           # Toast notifications
│   │   ├── spinner.ts          # Loading indicators
│   │   └── prompt.tsx          # Input prompt
│   ├── component/
│   │   ├── message-list.tsx    # Conversation messages
│   │   ├── input-box.tsx       # User input
│   │   ├── model-selector.tsx  # Model selection dialog
│   │   └── session-list.tsx    # Session management
│   ├── routes/
│   │   ├── home.tsx            # Home screen
│   │   └── session.tsx         # Chat session screen
│   └── theme/
│       ├── opencode.json       # Default theme
│       ├── dracula.json
│       ├── nord.json
│       └── ... (35+ themes)
├── package.json
└── tsconfig.json
```

## Implementation Phases

### Phase 1: Foundation

1. Setup project structure
2. Install core dependencies (`@opentui/solid`, `solid-js`)
3. Create basic app shell with terminal rendering
4. Implement ThemeProvider with 2-3 themes

### Phase 2: Core UI

1. DialogProvider - modal management
2. ToastProvider - notifications
3. KeybindProvider - keyboard shortcuts
4. RouteProvider - screen navigation

### Phase 3: AgentX Integration

1. AgentXProvider - connect via `agentxjs` client SDK
2. Event subscription and handling
3. Message streaming display

### Phase 4: Features

1. Home screen (session list, tips)
2. Session screen (conversation view)
3. Model selection dialog
4. Session management (new, switch, delete)

### Phase 5: Polish

1. Full theme support (35+ themes)
2. Custom keybindings
3. Clipboard integration
4. Terminal title updates

## Key Differences from OpenCode

| Aspect     | OpenCode            | AgentX CLI                 |
| ---------- | ------------------- | -------------------------- |
| SDK        | `@opencode-ai/sdk`  | `agentxjs`                 |
| Backend    | Internal API        | WebSocket to AgentX Server |
| Events     | Custom event system | AgentX EventBus            |
| State Sync | SyncProvider        | AgentX event subscription  |

## package.json

```json
{
  "name": "@agentxjs/cli",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "agentx": "./bin/agentx"
  },
  "dependencies": {
    "@opentui/core": "^0.1.77",
    "@opentui/solid": "^0.1.77",
    "solid-js": "^1.9.10",
    "agentxjs": "workspace:*",
    "yargs": "^18.0.0",
    "clipboardy": "^4.0.0"
  }
}
```

## References

- OpenCode TUI: `temp/opencode/packages/opencode/src/cli/cmd/tui/`
- OpenTUI: https://github.com/AnomalyCo/opentui
- Solid.js: https://www.solidjs.com/

## Notes

- Only reference UI patterns and components from OpenCode
- Implement all business logic independently using AgentX SDK
- Build incrementally, layer by layer
- Maintain our own architectural decisions
