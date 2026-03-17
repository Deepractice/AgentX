@journey @developer
Feature: Getting Started with AgentX SDK
  As a developer, I need a clear path from install to a working agent,
  so I can integrate AgentX into my application without reading source code.

  # ============================================================================
  # Core Concepts
  # ============================================================================

  Scenario: Developer understands the core data model
    Given I am new to AgentX
    When I read the getting started guide
    Then I should understand these concepts:
      | concept   | what it is                                       | analogy            |
      | Image     | Persistent agent config (prompt, tools, workspace) | A Docker image     |
      | Session   | Message history for an image                     | A conversation log |
      | Agent     | Running instance of an image                     | A Docker container |
      | Workspace | Agent's isolated working directory                | A project folder   |
    And the relationship is: Image > Session + Workspace + Agent
    And Instance is an internal concept — external API only uses Image

  # ============================================================================
  # Local Mode — Zero Infrastructure
  # ============================================================================

  Scenario: Developer creates first agent in local mode
    Given I have installed agentxjs with "bun add agentxjs @agentxjs/node-platform @agentxjs/mono-driver"
    And I have an Anthropic API key
    When I write this code:
      """
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

      const agent = await ax.chat.create({
        name: "Assistant",
        systemPrompt: "You are a helpful assistant.",
      });

      ax.on("text_delta", (e) => process.stdout.write(e.data.text));
      await agent.send("Hello, who are you?");
      """
    Then I should see a streaming response from the agent
    And no server or database is needed

  # ============================================================================
  # Presentation API — UI Integration
  # ============================================================================

  Scenario: Developer builds a chat UI with the Presentation API
    Given I need structured conversation state for a UI
    When I use the Presentation API:
      """
      const presentation = await agent.present({
        onUpdate: (state) => {
          // state.conversations — all messages (user, assistant, error)
          // state.status — "idle" | "submitted" | "thinking" | "responding" | "executing"
          // state.workspace — { files: FileTreeEntry[] } | null
          renderUI(state);
        },
      });

      await presentation.send("What is the weather?");
      """
    Then the onUpdate callback fires with structured PresentationState
    And I don't need to manually aggregate stream events

  # ============================================================================
  # Runtime Operations
  # ============================================================================

  Scenario: Developer uses the three runtime operations
    Given I have a running agent
    Then I can perform these runtime operations:
      | operation | method                        | description                    |
      | send      | presentation.send(content)    | Send message to agent          |
      | interrupt | presentation.interrupt()      | Interrupt current response     |
      | rewind    | presentation.rewind(index)    | Rewind conversation to a point |
    And rewind is a system-level operation that resets circuit breaker and truncates messages

  # ============================================================================
  # Workspace — File Operations
  # ============================================================================

  Scenario: Developer accesses agent workspace
    Given an agent with a workspace
    When I use the Presentation API:
      """
      // File tree auto-updates in state.workspace.files
      presentation.onUpdate((state) => {
        if (state.workspace) {
          renderFileTree(state.workspace.files);
        }
      });

      // File operations
      if (presentation.workspace) {
        const content = await presentation.workspace.read("src/index.ts");
        await presentation.workspace.write("output.txt", "Hello");
        const entries = await presentation.workspace.list("src");
      }
      """
    Then the file tree updates in real-time as the agent modifies files

  # ============================================================================
  # MCP Tools
  # ============================================================================

  Scenario: Developer adds tools to an agent via MCP
    Given I want my agent to use external tools
    When I create an agent with MCP servers:
      """
      const agent = await ax.chat.create({
        name: "Agent with Tools",
        systemPrompt: "You can access the filesystem.",
        mcpServers: {
          filesystem: {
            command: "npx",
            args: ["@modelcontextprotocol/server-filesystem", "/tmp"],
          },
        },
      });
      """
    Then agents created from this image can use those tools
    And tool execution events appear in the stream

  # ============================================================================
  # Remote Mode — Client/Server
  # ============================================================================

  Scenario: Developer sets up a server and connects a client
    Given I need multi-user support
    When I set up a server:
      """
      const ax = createAgentX(nodePlatform({ createDriver }));
      const server = await ax.serve({ port: 5200 });
      """
    And I connect a client:
      """
      const ax = createAgentX();
      const client = await ax.connect("ws://localhost:5200");
      // Same API as local mode
      const agent = await client.chat.create({ name: "Remote Agent" });
      """
    Then the client can use the exact same API as local mode

  # ============================================================================
  # Error Handling
  # ============================================================================

  Scenario: Developer handles errors
    Given I have an AgentX instance
    Then errors appear in two places:
      | layer        | how                                    | who uses it       |
      | Presentation | ErrorConversation in state.conversations | UI developers     |
      | ax.onError   | AgentXError callback                   | Platform operators |
    And Presentation errors are automatic — no extra code needed
