@journey @developer
Feature: Getting Started with AgentX SDK
  As a developer, I need a clear path from install to a working agent,
  so I can integrate AgentX into my application without reading source code.

  # ============================================================================
  # Core Concepts
  # ============================================================================

  Scenario: Developer understands the four-layer data model
    Given I am new to AgentX
    When I read the getting started guide
    Then I should understand these concepts:
      | concept   | what it is                              | analogy              |
      | Image     | Persistent agent config (prompt, tools) | A Docker image       |
      | Session   | Message history for an image            | A conversation log   |
      | Agent     | Running instance of an image            | A Docker container   |
    And the relationship is: Image > Session + Agent

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

      const createDriver = (config) => createMonoDriver({
        ...config,
        apiKey: process.env.ANTHROPIC_API_KEY,
        options: { provider: "anthropic" },
      });

      const ax = createAgentX(nodePlatform({ createDriver }));

      const { record: image } = await ax.image.create({
        name: "Assistant",
        systemPrompt: "You are a helpful assistant.",
      });

      const { instanceId } = await ax.runtime.instance.create({
        imageId: image.imageId,
      });

      ax.on("text_delta", (e) => process.stdout.write(e.data.text));
      ax.on("message_stop", () => {
        console.log();
        ax.dispose();
      });

      await ax.runtime.session.send(instanceId, "Hello, who are you?");
      """
    Then I should see a streaming response from the agent
    And no server or database is needed

  # ============================================================================
  # Remote Mode — Client/Server Architecture
  # ============================================================================

  Scenario: Developer understands when to use local vs remote mode
    Given I am choosing between local and remote mode
    Then the guide should explain:
      | mode   | use when                                     |
      | Local  | Prototyping, CLI tools, single-user apps     |
      | Remote | Web apps, multi-tenant, shared infrastructure |
    And the client API is identical in both modes

  Scenario: Developer sets up a server and connects a client
    Given I need multi-user support
    When I set up a server:
      """
      import { createAgentX } from "agentxjs";
      import { nodePlatform } from "@agentxjs/node-platform";
      import { createMonoDriver } from "@agentxjs/mono-driver";

      const createDriver = (config) => createMonoDriver({
        ...config,
        apiKey: process.env.ANTHROPIC_API_KEY,
        options: { provider: "anthropic" },
      });

      const ax = createAgentX(nodePlatform({ createDriver }));
      const server = await ax.serve({ port: 5200 });
      """
    And I connect a client:
      """
      import { createAgentX } from "agentxjs";

      const ax = createAgentX();
      const client = await ax.connect("ws://localhost:5200");

      // Same API as local mode
      await client.agent.create({ imageId: "..." });
      """
    Then the client can use the exact same namespace API as local mode

  # ============================================================================
  # Universal RPC
  # ============================================================================

  Scenario: Developer uses the universal RPC method
    Given I have an AgentX instance in any mode
    When I call rpc with a method and params:
      """
      // Useful for custom transport (e.g. Cloudflare Workers)
      const response = await ax.rpc(request.method, request.params);
      """
    Then the RPC method dispatches to the same handler as namespace methods

  # ============================================================================
  # Stream Events
  # ============================================================================

  Scenario: Developer handles streaming responses
    Given I have a running agent
    Then I can subscribe to these stream events:
      | event          | data               | meaning                |
      | message_start  | messageId, model   | LLM starts responding  |
      | text_delta     | text               | Incremental text chunk |
      | tool_use_start | toolName           | Tool call begins       |
      | tool_result    | toolCallId, result | Tool execution result  |
      | message_stop   | stopReason         | Response complete      |
      | error          | message            | Error occurred         |
    And I subscribe via ax.on("event_name", handler)

  # ============================================================================
  # Presentation API — UI Integration
  # ============================================================================

  Scenario: Developer builds a chat UI with the Presentation API
    Given I need structured conversation state for a UI
    When I use the Presentation API:
      """
      const presentation = await ax.runtime.present.create(instanceId, {
        onUpdate: (state) => {
          // state.conversations — completed messages (includes history)
          // state.streaming — current streaming response (or null)
          // state.status — "idle" | "thinking" | "responding" | "executing"
          renderUI(state);
        },
      });

      await presentation.send("What is the weather?");
      """
    Then the onUpdate callback fires with structured PresentationState
    And I don't need to manually aggregate stream events

  # ============================================================================
  # Message History
  # ============================================================================

  Scenario: Developer retrieves message history
    Given I have an agent with previous conversations
    When I want to access the message history:
      """
      // Get messages by image (persistent across agent instances)
      const messages = await ax.image.getMessages(imageId);

      // Get messages by agent session
      const messages = await ax.runtime.session.getMessages(instanceId);
      """
    Then I can display or process the conversation history

  # ============================================================================
  # Error Handling
  # ============================================================================

  Scenario: Developer handles errors via top-level onError
    Given I have an AgentX instance in any mode
    When I register an error handler:
      """
      ax.onError((error) => {
        console.error(`[${error.category}] ${error.code}: ${error.message}`);
        if (!error.recoverable) {
          // Circuit is open or fatal error
        }
      });
      """
    Then all AgentXError instances from any layer are delivered to this handler
    And this is independent of stream events and Presentation API

  # ============================================================================
  # MCP Tools
  # ============================================================================

  Scenario: Developer adds tools to an agent via MCP
    Given I want my agent to use external tools
    When I create an image with MCP servers:
      """
      const { record: image } = await ax.image.create({
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
