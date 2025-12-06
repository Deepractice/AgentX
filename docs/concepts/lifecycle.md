# Lifecycle Management

Understanding the Docker-style lifecycle in AgentX.

## Overview

AgentX follows a Docker-inspired lifecycle model:

```
Container → Agent → Session → Image
```

Each level has its own lifecycle and management API.

## Container Lifecycle

**Container** is an isolation boundary that manages multiple agents.

### States

```
[Not Created] → [Created] → [Destroyed]
```

### Operations

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
});

// Create container
const createRes = await agentx.request("container_create_request", {
  containerId: "my-container",
});
console.log("Container created:", createRes.data.containerId);

// Get container info
const getRes = await agentx.request("container_get_request", {
  containerId: "my-container",
});
console.log("Container exists:", getRes.data.exists);

// List all containers
const listRes = await agentx.request("container_list_request", {});
console.log("All containers:", listRes.data.containerIds);

// Destroy container (destroys all agents inside)
await agentx.request("container_destroy_request", {
  containerId: "my-container",
});
```

### Container Events

```typescript
// Listen to container lifecycle
agentx.on("container_created", (e) => {
  console.log("Container created:", e.data.containerId);
});

agentx.on("container_destroyed", (e) => {
  console.log("Container destroyed:", e.data.containerId);
});
```

---

## Agent Lifecycle

**Agent** is a running instance with conversation state.

### States

```
[Not Created] → [Running] → [Stopped] → [Destroyed]
                    ↑           │
                    └───────────┘
                      resume()
```

### Create Agent

```typescript
const agentRes = await agentx.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are a helpful assistant.",
  },
});

const agentId = agentRes.data.agentId;
console.log("Agent created:", agentId);
```

### Interact with Agent

```typescript
// Send message
await agentx.request("agent_receive_request", {
  agentId,
  content: "Hello!",
});

// Interrupt ongoing operation
await agentx.request("agent_interrupt_request", {
  agentId,
});
```

### Stop and Resume

```typescript
// Stop agent (preserves session)
await agentx.request("agent_stop_request", {
  agentId,
});

// Resume agent
await agentx.request("agent_resume_request", {
  agentId,
});
```

### Destroy Agent

```typescript
// Destroy single agent
const destroyRes = await agentx.request("agent_destroy_request", {
  agentId,
});
console.log("Destroyed:", destroyRes.data.success);

// Destroy all agents in container
await agentx.request("agent_destroy_all_request", {
  containerId: "my-container",
});
```

### Agent Events

```typescript
// Agent lifecycle events
agentx.on("agent_created", (e) => {
  console.log("Agent created:", e.data.agentId);
});

agentx.on("agent_stopped", (e) => {
  console.log("Agent stopped:", e.data.agentId);
});

agentx.on("agent_resumed", (e) => {
  console.log("Agent resumed:", e.data.agentId);
});

agentx.on("agent_destroyed", (e) => {
  console.log("Agent destroyed:", e.data.agentId);
});
```

---

## Session Lifecycle

**Session** stores conversation history for an agent.

### States

```
[Not Created] → [Created] → [Destroyed]
```

### Operations

```typescript
// Session is automatically created when agent is created
// But you can manage it manually:

// Get session
const sessionRes = await agentx.request("session_get_request", {
  sessionId: "session_123",
});

// Clear session (delete all messages)
await agentx.request("session_clear_request", {
  sessionId: "session_123",
});

// Delete session
await agentx.request("session_delete_request", {
  sessionId: "session_123",
});
```

### Session Events

```typescript
agentx.on("session_created", (e) => {
  console.log("Session created:", e.data.sessionId);
});

agentx.on("message_persisted", (e) => {
  console.log("Message saved:", e.data.messageId);
});

agentx.on("session_cleared", (e) => {
  console.log("Session cleared:", e.data.sessionId);
});
```

---

## Image Lifecycle

**Image** is a snapshot of agent state (like Docker image).

### States

```
Agent → [Snapshot] → Image → [Resume] → New Agent
```

### Create Snapshot

```typescript
// Create image from running agent
const snapshotRes = await agentx.request("image_snapshot_request", {
  agentId,
});

const imageId = snapshotRes.data.imageId;
console.log("Image created:", imageId);
```

### Resume from Image

```typescript
// Resume agent from image
const resumeRes = await agentx.request("image_resume_request", {
  imageId,
});

const newAgentId = resumeRes.data.agentId;
console.log("Agent resumed:", newAgentId);

// New agent has all conversation history from the snapshot
```

### Manage Images

```typescript
// List all images
const listRes = await agentx.request("image_list_request", {});
console.log("Images:", listRes.data.images);

// Get image details
const getRes = await agentx.request("image_get_request", {
  imageId,
});
console.log("Image:", getRes.data.image);

// Delete image
await agentx.request("image_delete_request", {
  imageId,
});
```

---

## Complete Lifecycle Example

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  const agentx = await createAgentX({
    llm: { apiKey: "sk-ant-xxxxx" },
    storage: { driver: "sqlite", path: "./data.db" },
  });

  // 1. Create container
  await agentx.request("container_create_request", {
    containerId: "my-container",
  });

  // 2. Run agent
  const agentRes = await agentx.request("agent_run_request", {
    containerId: "my-container",
    config: { name: "Assistant" },
  });
  const agentId = agentRes.data.agentId;

  // 3. Chat
  await agentx.request("agent_receive_request", {
    agentId,
    content: "Hello!",
  });

  // 4. Create snapshot
  const snapshotRes = await agentx.request("image_snapshot_request", {
    agentId,
  });
  const imageId = snapshotRes.data.imageId;

  // 5. Destroy agent
  await agentx.request("agent_destroy_request", {
    agentId,
  });

  // 6. Resume from snapshot (new agent with history)
  const resumeRes = await agentx.request("image_resume_request", {
    imageId,
  });
  const newAgentId = resumeRes.data.agentId;

  // 7. Continue conversation
  await agentx.request("agent_receive_request", {
    agentId: newAgentId,
    content: "Do you remember what we talked about?",
  });

  // Cleanup
  await agentx.dispose();
}

main().catch(console.error);
```

---

## Lifecycle Best Practices

### 1. Always Dispose

```typescript
const agentx = await createAgentX({ llm: { apiKey: "..." } });

try {
  // Your code
} finally {
  await agentx.dispose(); // Always cleanup
}
```

### 2. Use Try-Catch

```typescript
try {
  await agentx.request("agent_run_request", {
    containerId: "my-container",
    config: { name: "Test" },
  });
} catch (error) {
  console.error("Failed to create agent:", error);
}
```

### 3. Handle Interrupts

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await agentx.dispose();
  process.exit(0);
});
```

### 4. Snapshot Before Destroy

```typescript
// Save state before destroying
const imageRes = await agentx.request("image_snapshot_request", {
  agentId,
});

await agentx.request("agent_destroy_request", {
  agentId,
});

// Can resume later
const resumeRes = await agentx.request("image_resume_request", {
  imageId: imageRes.data.imageId,
});
```

---

## Next Steps

- **[Event System](./event-system.md)** - Event subscription patterns
- **[Session Management Guide](../guides/sessions.md)** - Working with sessions
- **[Persistence Guide](../guides/persistence.md)** - Storage backends
