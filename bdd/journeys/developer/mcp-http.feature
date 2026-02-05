@journey @developer
Feature: MCP Server - HTTP
  A developer wants to connect their agent to a remote
  MCP server via Streamable HTTP transport.
  The MCP server is already running as a web service.

  Scenario: Agent uses a remote HTTP MCP server to query code context
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"

    # Phase 2: Create agent with HTTP MCP server
    And I create an image "CodeAgent" in "my-app" with prompt "You are a helpful assistant. Use the deepwiki tool to answer questions about GitHub repositories." and mcp servers:
      | name     | url                          |
      | deepwiki | https://mcp.deepwiki.com/mcp |
    And I run the image as an agent

    # Phase 3: Query via remote MCP
    When I send message "Use the deepwiki tool to describe the Deepractice/AgentX repository"
    Then I should receive a non-empty reply
    And the reply should contain "AgentX"

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
