@agent
Feature: Agent Destroy API
  As a developer using AgentX
  I want to destroy agents
  So that I can clean up resources

  Background:
    Given I create an AgentX client connected to the test server
    And I have a container and image ready
    When I call createAgent with the saved imageId
    And I save response.agentId as "agentId"

  @destroy
  Scenario: Destroy existing agent
    When I call destroyAgent with the saved agentId
    Then the response should succeed
    And the agent "${agentId}" should not exist

  @destroy
  Scenario: Destroy non-existent agent succeeds (idempotent)
    When I call destroyAgent with id "non-existent-agent-id"
    Then the response should succeed
