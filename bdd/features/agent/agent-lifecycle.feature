Feature: Agent Lifecycle
  As a developer
  I want to create and destroy agents
  So that I can manage AI conversation instances

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"

  # ==================== Create ====================

  Scenario: Create agent with driver and presenter
    When I create an agent with the driver and presenter
    Then the agent should be created successfully
    And the agent should have a unique agentId
    And the agent createdAt should be set
    And the agent lifecycle should be "running"
    And the agent state should be "idle"
    And the agent messageQueue should be empty

  Scenario: Create multiple agents
    When I create 3 agents with different drivers
    Then each agent should have a unique agentId

  # ==================== Destroy ====================

  Scenario: Destroy idle agent
    Given an agent is created
    And the agent state is "idle"
    When I call destroy on the agent
    Then the agent lifecycle should be "destroyed"

  Scenario: Destroy agent while processing
    Given an agent is created
    And the agent is processing a message
    When I call destroy on the agent
    Then the driver interrupt should be called
    And the agent lifecycle should be "destroyed"

  # ==================== Lifecycle Events ====================

  Scenario: onReady called immediately if already running
    Given an agent is created
    When I subscribe to onReady
    Then the handler should be called immediately

  Scenario: onDestroy called when agent is destroyed
    Given an agent is created
    And I subscribe to onDestroy
    When I call destroy on the agent
    Then the onDestroy handler should be called

  # ==================== Error Cases ====================

  Scenario: Cannot receive after destroy
    Given an agent is created
    And the agent is destroyed
    When I try to send a message
    Then it should fail with agent destroyed error

  Scenario: Cannot subscribe after destroy
    Given an agent is created
    And the agent is destroyed
    When I try to subscribe to events
    Then it should fail with agent destroyed error
