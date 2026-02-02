# @agentxjs/ui

React component library for building AI agent chat interfaces. Provides streaming-optimized components, hooks for AgentX binding, and a complete design system.

## Installation

```bash
bun add @agentxjs/ui
```

### Peer Dependencies

```bash
bun add react react-dom
```

### CSS Setup

Import global styles in your application entry point:

```tsx
import "@agentxjs/ui/globals.css";
```

Or use the Tailwind preset for custom styling:

```js
// tailwind.config.js
import agentxPreset from "@agentxjs/ui/tailwind-preset";

export default {
  presets: [agentxPreset],
  content: ["./src/**/*.{ts,tsx}", "./node_modules/@agentxjs/ui/dist/**/*.js"],
};
```

## Quick Start

The simplest way to build a chat interface:

```tsx
import { Studio, useAgentX } from "@agentxjs/ui";
import "@agentxjs/ui/globals.css";

function App() {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) return <div>Connecting...</div>;

  return <Studio agentx={agentx} containerId="user-123" />;
}
```

For responsive layouts that adapt to mobile:

```tsx
import { ResponsiveStudio, useAgentX } from "@agentxjs/ui";

function App() {
  const agentx = useAgentX("ws://localhost:5200");
  return <ResponsiveStudio agentx={agentx} containerId="user-123" />;
}
```

## Key Components

### Studio

Complete chat workspace with sidebar and chat area.

```tsx
<Studio
  agentx={agentx}
  containerId="user-123"
  sidebarWidth={280}
  collapsible={true}
  searchable={true}
/>
```

### ResponsiveStudio

Automatically switches between desktop and mobile layouts.

```tsx
<ResponsiveStudio agentx={agentx} containerId="user-123" breakpoint={768} />
```

## Hooks

### useAgentX

Creates an AgentX instance connected to a remote server.

```tsx
const agentx = useAgentX("ws://localhost:5200");
```

### useAgent

Binds to agent events and manages conversation state.

```tsx
const {
  conversations, // ConversationData[]
  streamingText, // Current streaming text
  status, // Agent status
  send, // Send message function
  interrupt, // Interrupt response
  isLoading, // Loading state
} = useAgent(agentx, imageId);
```

### useImages

Manages conversation list (create, run, stop, delete).

```tsx
const {
  images, // ImageListItem[]
  createImage,
  runImage,
  stopImage,
  deleteImage,
  refresh,
} = useImages(agentx, { containerId: "user-123" });
```

### useIsMobile

Detects mobile viewport.

```tsx
const isMobile = useIsMobile(); // default 768px
const isSmall = useIsMobile(640); // custom breakpoint
```

## Component Categories

| Category       | Components                                       |
| -------------- | ------------------------------------------------ |
| **Studio**     | `Studio`, `ResponsiveStudio`, `MobileStudio`     |
| **Container**  | `Chat`, `AgentList`, `ChatHeader`, `ToolCard`    |
| **Entry**      | `UserEntry`, `AssistantEntry`, `ErrorEntry`      |
| **Block**      | `TextBlock`, `ToolBlock`                         |
| **Pane**       | `MessagePane`, `InputPane`, `ListPane`, `NavBar` |
| **Layout**     | `Header`, `Sidebar`, `Panel`, `MainContent`      |
| **Typography** | `MarkdownText`, `JSONRenderer`, `DiffViewer`     |
| **Element**    | `Button`, `Input`, `Badge`, `EmptyState`, etc.   |
| **Mobile**     | `MobileChat`, `MobileHeader`, `MobileInputPane`  |

## Theming

The package uses semantic color tokens via CSS variables:

| Token         | Purpose                    | Default            |
| ------------- | -------------------------- | ------------------ |
| `primary`     | Computational intelligence | Blue (`#0284c7`)   |
| `secondary`   | Generative creativity      | Amber (`#f59e0b`)  |
| `accent`      | Interactive highlights     | Orange (`#f97316`) |
| `success`     | Positive feedback          | Green (`#22c55e`)  |
| `destructive` | Error states               | Red (`#ef4444`)    |

Dark mode is supported via CSS variables. Use a theme provider like `next-themes`:

```tsx
import { ThemeProvider } from "next-themes";

<ThemeProvider attribute="class" defaultTheme="system">
  <App />
</ThemeProvider>;
```

## Development

Run Storybook from monorepo root:

```bash
bun dev storybook
```

Build the package:

```bash
cd packages/ui
bun build
```

## Documentation

- [Full API Reference](../../docs/packages/ui.md)
- [Storybook](http://localhost:6006) - Interactive component examples

## Related Packages

- [agentxjs](../agentx) - Platform API (createAgentX, defineAgent)
- [@agentxjs/types](../types) - Type definitions
- [@agentxjs/agent](../agent) - Agent runtime

## License

MIT
