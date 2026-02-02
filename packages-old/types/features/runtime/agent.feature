Feature: Running Agent Management
  As a developer
  I want to query and interact with running agents
  So that I can control active conversations

  Background:
    Given a runtime is initialized
    And a container "default" exists
    And an image "translator" exists
    And a session "session-1" exists in container "default" with image "translator"

  # ==================== Get ====================

  Scenario: Get running agent info
    Given an agent is running from session "session-1"
    When I get the agent info by its ID
    Then I should receive the agent info
    And the agent info should contain sessionId

  Scenario: Get non-running agent
    When I get agent by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List agents when none running
    When I list all running agents
    Then I should receive an empty list

  Scenario: List multiple running agents
    Given a session "session-2" exists in container "default" with image "translator"
    And an agent is running from session "session-1"
    And an agent is running from session "session-2"
    When I list all running agents
    Then I should receive 2 agents

  # ==================== Receive ====================

  Scenario: Send message to running agent
    Given an agent is running from session "session-1"
    When I send message "Hello" to the agent
    Then the agent should process the message

  Scenario: Send message to non-existing agent
    When I send message "Hello" to agent "non-existing-id"
    Then it should fail with agent not found error

  # ==================== Interrupt ====================

  Scenario: Interrupt running agent
    Given an agent is running from session "session-1"
    And the agent is processing a message
    When I interrupt the agent
    Then the agent should return to idle state

  Scenario: Interrupt non-existing agent
    When I interrupt agent "non-existing-id"
    Then it should complete without error

  # ==================== Destroy ====================

  Scenario: Destroy running agent
    Given an agent is running from session "session-1"
    When I destroy the agent
    Then the agent should not be running
    And the session data should be preserved

  Scenario: Destroy non-existing agent
    When I destroy agent "non-existing-id"
    Then it should complete without error
