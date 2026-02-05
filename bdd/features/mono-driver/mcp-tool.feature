@mono-driver @vcr @mcp-tool
Feature: MonoDriver MCP Tool
  As a developer using MonoDriver
  I want the LLM to discover and use tools from MCP servers
  So that agents can leverage external capabilities via MCP

  Background:
    Given I have a MonoDriver with provider "anthropic" and MCP filesystem server

  Scenario: LLM uses MCP filesystem tool to read a file
    When I send message "Use the read_file tool to read the file hello.txt and tell me its content" to the driver
    Then I should receive a "tool_use_start" driver event
    And I should receive a "tool_result" driver event
    And the combined text delta should contain "Hello from AgentX MCP test"
