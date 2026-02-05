# Session Management Guide

Practical guide to managing sessions in AgentX: creating, resuming, forking, and persisting conversations.

## Overview

In AgentX, a **Session** is the conversation history store for an agent. Sessions work together with Images to provide persistent conversation capabilities:

- **Image** - The persistent conversation entity (like a Docker image)
- **Session** - The message storage for that conversation
- **Agent** - The runtime instance that reads/writes to the session

```
Image (persistent)
  │
  ├── Session (messages)
  │     └── Message 1, Message 2, ...
  │
  └── Agent (runtime)
        └── Processes input, generates responses
```

When you create an Image, a Session is automatically created. When you run an Agent from that Image, it uses the associated Session for conversation history.

## Session Lifecycle

```
[Create Image] → [Session Created] → [Run Agent] → [Chat] → [Stop Agent] → [Resume Agent]
                                                       │
                                                       └── Session persists across restarts
```

Sessions persist even when:

- The Agent is stopped
- The Agent is destroyed
- The server restarts (with SQLite persistence)

## Creating Sessions

Sessions are created automatically when you create an Image:

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
});

// Create container
await agentx.request("container_create_request", {
  containerId: "my-container",
});

// Run agent - this creates an Image and Session automatically
const agentRes = await agentx.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are a helpful assistant.",
  },
});

const agentId = agentRes.data.agentId;
const imageId = agentRes.data.imageId;
const sessionId = agentRes.data.sessionId;

console.log("Agent created:", agentId);
console.log("Image ID:", imageId);
console.log("Session ID:", sessionId);
```

## Sending Messages

Messages sent to an Agent are automatically persisted to its Session:

```typescript
// Subscribe to events
agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});

agentx.on("message_persisted", (e) => {
  console.log("Message saved:", e.data.messageId);
});

// Send message
await agentx.request("agent_receive_request", {
  agentId,
  content: "Hello! What can you help me with?",
});

// The user_message and assistant_message are both persisted
```

## Session Persistence

By default, AgentX uses SQLite for session persistence. Data is stored in `~/.agentx/data/agentx.db`.

### Default Storage Location

```typescript
// Default: ~/.agentx/data/agentx.db
const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
});
```

### Custom Storage Location

```typescript
// Custom agentx directory
const agentx = await createAgentX({
  llm: { apiKey: "sk-ant-xxxxx" },
  agentxDir: "/var/lib/my-app/agentx",
});

// Data will be stored at: /var/lib/my-app/agentx/data/agentx.db
```

### Session Events

Listen to session lifecycle events:

```typescript
// Session created
agentx.on("session_created", (e) => {
  console.log("Session created:", e.data.sessionId);
  console.log("  Image ID:", e.data.imageId);
  console.log("  Container:", e.data.containerId);
});

// Message persisted
agentx.on("message_persisted", (e) => {
  console.log("Message persisted:", e.data.messageId);
  console.log("  Session:", e.data.sessionId);
});

// Session cleared
agentx.on("session_cleared", (e) => {
  console.log("Session cleared:", e.data.sessionId);
});

// Session destroyed
agentx.on("session_destroyed", (e) => {
  console.log("Session destroyed:", e.data.sessionId);
});
```

## Resuming Sessions

The power of sessions is the ability to resume conversations. When you resume an Agent from an Image, it automatically loads the conversation history.

### Resume from Image

```typescript
// First conversation session
const agentRes = await agentx.request("agent_run_request", {
  containerId: "my-container",
  config: {
    name: "Assistant",
    systemPrompt: "You are a helpful assistant.",
  },
});

const imageId = agentRes.data.imageId;

// Send some messages
await agentx.request("agent_receive_request", {
  agentId: agentRes.data.agentId,
  content: "My name is Alice.",
});

// Stop the agent
await agentx.request("agent_stop_request", {
  agentId: agentRes.data.agentId,
});

// Later... resume the conversation from the same Image
const resumeRes = await agentx.request("image_resume_request", {
  imageId,
});

const newAgentId = resumeRes.data.agentId;

// Continue the conversation - the agent remembers Alice!
await agentx.request("agent_receive_request", {
  agentId: newAgentId,
  content: "What is my name?",
});
// Assistant will respond: "Your name is Alice."
```

### Session Resume Event

Listen for session resume events:

```typescript
agentx.on("session_resumed", (e) => {
  console.log("Session resumed:", e.data.sessionId);
  console.log("  Agent ID:", e.data.agentId);
  console.log("  Resumed at:", new Date(e.data.resumedAt));
});
```

## Getting Session Messages

Retrieve the conversation history from a session:

```typescript
// Get session info
const sessionRes = await agentx.request("session_get_request", {
  sessionId,
});

console.log("Session:", sessionRes.data.session);

// The session contains all messages
// Messages are ordered chronologically
for (const message of sessionRes.data.messages) {
  console.log(`[${message.role}]: ${message.content}`);
}
```

## Clearing Session History

Clear all messages from a session while keeping the session itself:

```typescript
// Clear all messages
await agentx.request("session_clear_request", {
  sessionId,
});

// The session still exists, but has no messages
// The next conversation will start fresh
```

### Implementing a "New Chat" Feature

```typescript
async function startNewChat(agentx, agentId, sessionId) {
  // Clear the session
  await agentx.request("session_clear_request", {
    sessionId,
  });

  console.log("Chat history cleared. Starting fresh!");
}

// Example usage
agentx.on("session_cleared", () => {
  console.log("Ready for a new conversation.");
});

await startNewChat(agentx, agentId, sessionId);
```

## Session Forking (Branching Conversations)

Fork a session to create a new conversation branch from an existing point. This is useful for:

- Exploring alternative conversation paths
- Creating variations of a conversation
- "What if" scenarios

```typescript
// Fork the session
const forkRes = await agentx.request("session_fork_request", {
  sessionId,
  newTitle: "Alternative Discussion",
});

const newSessionId = forkRes.data.newSessionId;
const newImageId = forkRes.data.newImageId;

console.log("Forked session:", newSessionId);
console.log("New image:", newImageId);

// The new session has all messages up to the fork point
// Continue the forked conversation independently
const forkAgentRes = await agentx.request("image_resume_request", {
  imageId: newImageId,
});

await agentx.request("agent_receive_request", {
  agentId: forkAgentRes.data.agentId,
  content: "Let's explore a different topic...",
});
```

### Fork Event

```typescript
agentx.on("session_forked", (e) => {
  console.log("Session forked!");
  console.log("  Original session:", e.data.originalSessionId);
  console.log("  New session:", e.data.newSessionId);
  console.log("  New image:", e.data.newImageId);
});
```

## Multi-Session Management

Manage multiple conversations simultaneously:

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  const agentx = await createAgentX({
    llm: { apiKey: "sk-ant-xxxxx" },
  });

  await agentx.request("container_create_request", {
    containerId: "multi-chat",
  });

  // Create multiple agents with their own sessions
  const agents = [];

  for (const name of ["Alice", "Bob", "Charlie"]) {
    const res = await agentx.request("agent_run_request", {
      containerId: "multi-chat",
      config: {
        name: `${name}'s Assistant`,
        systemPrompt: `You are ${name}'s personal assistant.`,
      },
    });

    agents.push({
      name,
      agentId: res.data.agentId,
      sessionId: res.data.sessionId,
      imageId: res.data.imageId,
    });
  }

  // Each agent has its own session with separate history
  for (const agent of agents) {
    await agentx.request("agent_receive_request", {
      agentId: agent.agentId,
      content: `Hello, I'm ${agent.name}!`,
    });
  }

  // List all sessions in the container
  const sessionsRes = await agentx.request("session_list_request", {
    containerId: "multi-chat",
  });

  console.log("Active sessions:", sessionsRes.data.sessions.length);
  for (const session of sessionsRes.data.sessions) {
    console.log(`  - ${session.sessionId}`);
  }

  await agentx.dispose();
}
```

## Session Title Management

Update the title of a session for better organization:

```typescript
// Update session title
await agentx.request("session_title_update_request", {
  sessionId,
  title: "Project Planning Discussion",
});

// Listen for title updates
agentx.on("session_title_updated", (e) => {
  console.log("Title updated:", e.data.title);
});
```

## Deleting Sessions

Permanently delete a session and its messages:

```typescript
// Delete a single session
await agentx.request("session_delete_request", {
  sessionId,
});

// Note: This also deletes the associated Image
// The agent using this session will be stopped
```

## Complete Example: Chat Application with Session Management

```typescript
import { createAgentX } from "agentxjs";
import * as readline from "node:readline/promises";

async function main() {
  const agentx = await createAgentX({
    llm: { apiKey: process.env.ANTHROPIC_API_KEY },
  });

  // Event handlers
  agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
  agentx.on("conversation_end", () => console.log("\n"));

  await agentx.request("container_create_request", {
    containerId: "chat-app",
  });

  // Track current session
  let currentAgentId: string | null = null;
  let currentSessionId: string | null = null;
  let currentImageId: string | null = null;

  // Start new conversation
  async function newConversation() {
    const res = await agentx.request("agent_run_request", {
      containerId: "chat-app",
      config: {
        name: "Assistant",
        systemPrompt: "You are a helpful assistant.",
      },
    });

    currentAgentId = res.data.agentId;
    currentSessionId = res.data.sessionId;
    currentImageId = res.data.imageId;

    console.log("\nNew conversation started.");
    console.log(`Session: ${currentSessionId}\n`);
  }

  // Resume existing conversation
  async function resumeConversation(imageId: string) {
    const res = await agentx.request("image_resume_request", {
      imageId,
    });

    currentAgentId = res.data.agentId;
    currentSessionId = res.data.sessionId;
    currentImageId = imageId;

    console.log("\nConversation resumed.");
    console.log(`Session: ${currentSessionId}\n`);
  }

  // Clear current conversation
  async function clearConversation() {
    if (!currentSessionId) {
      console.log("No active conversation.");
      return;
    }

    await agentx.request("session_clear_request", {
      sessionId: currentSessionId,
    });

    console.log("Conversation cleared.\n");
  }

  // Fork current conversation
  async function forkConversation() {
    if (!currentSessionId) {
      console.log("No active conversation to fork.");
      return;
    }

    const res = await agentx.request("session_fork_request", {
      sessionId: currentSessionId,
      newTitle: "Forked Conversation",
    });

    await resumeConversation(res.data.newImageId);
    console.log("Conversation forked and switched to new branch.\n");
  }

  // Start with a new conversation
  await newConversation();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Commands:");
  console.log("  /new     - Start new conversation");
  console.log("  /clear   - Clear current conversation");
  console.log("  /fork    - Fork current conversation");
  console.log("  /history - Show session info");
  console.log("  /quit    - Exit\n");

  while (true) {
    const input = await rl.question("You: ");

    if (!input.trim()) continue;

    // Handle commands
    if (input === "/new") {
      await newConversation();
      continue;
    }

    if (input === "/clear") {
      await clearConversation();
      continue;
    }

    if (input === "/fork") {
      await forkConversation();
      continue;
    }

    if (input === "/history") {
      if (currentSessionId) {
        console.log(`\nCurrent Session: ${currentSessionId}`);
        console.log(`Image ID: ${currentImageId}`);
        console.log(`Agent ID: ${currentAgentId}\n`);
      } else {
        console.log("\nNo active session.\n");
      }
      continue;
    }

    if (input === "/quit") {
      break;
    }

    // Send message
    if (!currentAgentId) {
      console.log("No active agent. Use /new to start a conversation.\n");
      continue;
    }

    try {
      process.stdout.write("Assistant: ");
      await agentx.request("agent_receive_request", {
        agentId: currentAgentId,
        content: input,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  }

  rl.close();
  await agentx.dispose();
  console.log("Goodbye!");
}

process.on("SIGINT", () => {
  console.log("\n\nGoodbye!");
  process.exit(0);
});

main().catch(console.error);
```

## Session Architecture Deep Dive

### Image-Session Relationship

Each Image has exactly one Session:

```
ImageRecord
├── imageId: "img_abc123"
├── sessionId: "sess_xyz789"  ← Links to Session
├── name: "My Conversation"
├── systemPrompt: "You are helpful."
└── metadata: { driverSessionId: "..." }

SessionRecord
├── sessionId: "sess_xyz789"
├── imageId: "img_abc123"  ← Links back to Image
├── containerId: "container_1"
└── messages: [...]
```

### Message Storage

Messages are stored in the Session with full type information:

```typescript
interface Message {
  id: string; // Unique message ID
  role: "user" | "assistant" | "tool_call" | "tool_result";
  subtype: string; // More specific type
  content: unknown; // Message content (varies by type)
  timestamp: number; // When the message was created
}
```

### Driver Session ID

AgentX stores the driver session ID in the Image metadata for conversation resume:

```typescript
interface ImageMetadata {
  driverSessionId?: string; // For driver conversation resume
}
```

This enables the driver to maintain conversation context even across agent restarts.

## Best Practices

### 1. Always Handle Session Events

```typescript
agentx.on("session_created", (e) => {
  // Log session creation
});

agentx.on("message_persisted", (e) => {
  // Update UI, sync to external systems
});

agentx.on("session_destroyed", (e) => {
  // Clean up any references
});
```

### 2. Use Image Resume for Long-Running Conversations

```typescript
// Store imageId for later resume
const imageId = agentRes.data.imageId;
saveToDatabase(userId, imageId);

// Later, resume the conversation
const savedImageId = loadFromDatabase(userId);
await agentx.request("image_resume_request", {
  imageId: savedImageId,
});
```

### 3. Clear Sessions for Privacy

```typescript
// When user requests to delete chat history
await agentx.request("session_clear_request", {
  sessionId,
});

// Or completely delete the session and image
await agentx.request("session_delete_request", {
  sessionId,
});
```

### 4. Fork for Experimentation

```typescript
// Before trying something risky, fork the conversation
const forkRes = await agentx.request("session_fork_request", {
  sessionId,
  newTitle: "Experiment Branch",
});

// Try the experiment in the forked session
// Original conversation is preserved
```

### 5. Organize with Titles

```typescript
// Set meaningful titles for conversations
await agentx.request("session_title_update_request", {
  sessionId,
  title: `Project: ${projectName}`,
});
```

## Troubleshooting

### Session Not Persisting

1. Check that SQLite storage is configured:

```typescript
const agentx = await createAgentX({
  llm: { apiKey: "..." },
  agentxDir: "./data", // Ensure this directory is writable
});
```

2. Verify the database file exists:

```bash
ls -la ~/.agentx/data/agentx.db
```

### Messages Not Loading on Resume

1. Ensure you're using `image_resume_request`, not `agent_run_request`:

```typescript
// Correct - resumes existing session
await agentx.request("image_resume_request", { imageId });

// Wrong - creates new session
await agentx.request("agent_run_request", { ... });
```

2. Check that the imageId is correct and still exists.

### Session Cleared Unexpectedly

Check for calls to `session_clear_request` or `session_delete_request` in your code.

## Next Steps

- **[Lifecycle Management](../concepts/lifecycle.md)** - Understanding the full lifecycle
- **[Event System](../concepts/event-system.md)** - All event types explained
- **[Persistence Guide](./persistence.md)** - Storage backends and configuration
