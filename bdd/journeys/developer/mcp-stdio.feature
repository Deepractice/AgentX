@journey @developer @pending
Feature: MCP Server - Stdio
  A developer wants to give their agent custom capabilities
  by connecting a local MCP server via stdio transport.
  The MCP server runs as a child process.

  # ============================================
  # REQUIRES: MonoDriver MCP support (stdio transport)
  # Currently only ClaudeDriver supports MCP.
  # ============================================

  Scenario: Agent uses filesystem MCP server to read and write files
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"

    # Phase 2: Create agent with filesystem MCP server
    And I create an image "FileAgent" in "my-app" with prompt "You are a helpful assistant. Use the filesystem tools to read and write files." and mcp servers:
      | name       | command | args                                                    |
      | filesystem | npx     | -y @modelcontextprotocol/server-filesystem /tmp/agentx  |
    And I run the image as an agent

    # Phase 3: Write a file via MCP
    When I send message "Create a file at /tmp/agentx/hello.txt with the content 'Hello from MCP'"
    Then I should receive a non-empty reply

    # Phase 4: Read it back via MCP
    When I send message "Read the file /tmp/agentx/hello.txt and tell me what it says"
    Then I should receive a non-empty reply
    And the reply should contain "Hello from MCP"

    # Phase 5: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
