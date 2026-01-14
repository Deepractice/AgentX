@reliability @shutdown
Feature: Graceful Shutdown
  AgentX must shut down cleanly within reasonable time limits.
  Prevents zombie processes and resource leaks.

  # ============================================================================
  # Local Mode Shutdown
  # ============================================================================

  @local
  Scenario: Local mode dispose completes within 2 seconds
    Given an AgentX instance in local mode
    When I call agentx.listen(25100)
    And I wait 100ms for server to start
    And I call agentx.dispose with 2000ms timeout
    Then dispose should complete successfully
    And dispose duration should be less than 2000ms

  @local
  Scenario: Local mode dispose is idempotent
    Given an AgentX instance in local mode
    When I call agentx.listen(25101)
    And I call agentx.dispose and measure time
    And I call agentx.dispose again
    Then both dispose calls should succeed
    And second dispose should complete in less than 100ms

  # ============================================================================
  # Server Mode Shutdown
  # ============================================================================

  @server
  Scenario: Server shutdown completes within 2 seconds
    Given an AgentX server is running on port 15300
    And a remote AgentX client connected to "ws://localhost:15300"
    When I call agentx.dispose with 2000ms timeout
    Then dispose should complete successfully
    And dispose duration should be less than 2000ms

  @server
  Scenario: Server handles multiple clients disconnecting
    Given an AgentX server is running on port 15300
    And 5 remote clients are connected to "ws://localhost:15300"
    When all clients call dispose simultaneously
    Then all disposes should complete within 2000ms total
