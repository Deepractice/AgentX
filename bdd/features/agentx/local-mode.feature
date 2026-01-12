@agentx @local
Feature: AgentX Local Mode
  Create and use AgentX in local mode (embedded runtime).
  Local mode runs the full runtime in-process, suitable for Node.js applications.

  # ============================================================================
  # createAgentX() - Instance Creation
  # ============================================================================

  Scenario: createAgentX() returns AgentX instance with all methods
    When I call createAgentX()
    Then I should receive an AgentX instance
    And AgentX should have method "request"
    And AgentX should have method "on"
    And AgentX should have method "onCommand"
    And AgentX should have method "emitCommand"
    And AgentX should have method "listen"
    And AgentX should have method "close"
    And AgentX should have method "dispose"

  Scenario: createAgentX() with custom LLM config
    When I call createAgentX with config:
      | llm.apiKey  | sk-test-key    |
      | llm.model   | claude-sonnet-4-20250514 |
    Then I should receive an AgentX instance

  Scenario: createAgentX() with custom agentxDir
    When I call createAgentX with agentxDir "/tmp/agentx-test"
    Then I should receive an AgentX instance

  # ============================================================================
  # dispose() - Resource Cleanup
  # ============================================================================

  Scenario: dispose() releases all resources
    Given an AgentX instance in local mode
    When I call agentx.dispose()
    Then the promise should resolve
    And all resources should be released

  # ============================================================================
  # listen() / close() - Server Mode
  # ============================================================================

  @server
  Scenario: listen(port) starts WebSocket server
    Given an AgentX instance in local mode
    When I call agentx.listen(15200)
    Then the server should be running on port 15200
    And I call agentx.close()

  @server
  Scenario: listen(port, host) starts server on specific host
    Given an AgentX instance in local mode
    When I call agentx.listen(15201, "127.0.0.1")
    Then the server should be running on 127.0.0.1:15201
    And I call agentx.close()

  @server
  Scenario: close() stops the server
    Given an AgentX instance in local mode
    And agentx is listening on port 15202
    When I call agentx.close()
    Then the server should be stopped
