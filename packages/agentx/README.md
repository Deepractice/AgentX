# agentxjs

Client SDK for building AI agent applications. Supports local, remote, and server modes through a unified API.

## Install

```bash
bun add agentxjs @agentxjs/node-platform @agentxjs/mono-driver
```

## Quick Start

```typescript
import { createAgentX } from "agentxjs";
import { nodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";

const ax = createAgentX(nodePlatform({
  createDriver: (config) => createMonoDriver({
    ...config,
    apiKey: process.env.ANTHROPIC_API_KEY,
    options: { provider: "anthropic" },
  }),
}));

// Create agent and chat
const agent = await ax.chat.create({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});

ax.on("text_delta", (e) => process.stdout.write(e.data.text));
await agent.send("Hello!");
```

## Core API

### ChatNamespace — Conversation Management

```typescript
const agent = await ax.chat.create({ name, model?, systemPrompt?, mcpServers? });
const agent = await ax.chat.get(imageId);
const list = await ax.chat.list();
```

### AgentHandle — Live Agent Reference

```typescript
await agent.send("Hello!");                    // Send message
await agent.interrupt();                       // Interrupt response
await agent.history();                         // Get message history
const pres = await agent.present({ onUpdate }); // Create Presentation
await agent.update({ name, systemPrompt });    // Update config
await agent.delete();                          // Delete agent
```

### Presentation — UI State Management

The recommended way to build chat UIs. Aggregates stream events into structured state.

```typescript
const pres = await agent.present({
  onUpdate: (state) => {
    // state.conversations — all messages (user, assistant, error)
    // state.status — "idle" | "submitted" | "thinking" | "responding" | "executing"
    // state.workspace — { files: FileTreeEntry[] } | null
    // state.metrics — token usage and context tracking
    renderUI(state);
  },
});

await pres.send("What is the weather?");
await pres.rewind(2);                          // Rewind to index (runtime-level operation)
await pres.editAndResend(2, "New question");   // Edit and resend
```

#### Workspace Operations

When an agent has a workspace, file operations and real-time file tree are available:

```typescript
if (pres.workspace) {
  const content = await pres.workspace.read("src/index.ts");
  await pres.workspace.write("output.txt", "Hello");
  const entries = await pres.workspace.list("src");
}

// File tree auto-updates in state.workspace.files
```

### Runtime Namespace (Advanced)

```typescript
// Image operations
ax.runtime.image.create(config)       // Create image
ax.runtime.image.get(imageId)         // Get image
ax.runtime.image.list()               // List images
ax.runtime.image.update(imageId, upd) // Update image
ax.runtime.image.delete(imageId)      // Delete image
ax.runtime.image.getMessages(imageId) // Get message history
ax.runtime.image.run(imageId)         // Start agent from image
ax.runtime.image.stop(imageId)        // Stop agent

// Session operations
ax.runtime.session.send(imageId, content)  // Send message
ax.runtime.session.interrupt(imageId)      // Interrupt
ax.runtime.session.getMessages(imageId)    // Get messages

// LLM provider management
ax.runtime.llm.create({ name, vendor, protocol, apiKey })
ax.runtime.llm.setDefault(id)
```

### Error Handling

```typescript
// Presentation: errors appear as ErrorConversation in state.conversations
// Advanced: programmatic error handling
ax.onError((error) => {
  console.error(`[${error.category}] ${error.code}: ${error.message}`);
});
```

## Modes

| Mode | Setup | Use Case |
|------|-------|----------|
| Local | `createAgentX(nodePlatform({ createDriver }))` | CLI tools, single-user |
| Remote | `ax.connect("ws://...")` | Web apps, multi-tenant |
| Server | `ax.serve({ port: 5200 })` | Backend service |
