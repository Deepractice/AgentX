@agent
Feature: Agent Get API
  As a developer using AgentX
  I want to get agent information
  So that I can check agent status

  Background:
    Given I create an AgentX client connected to the test server
    And I have a container and image ready

  @get
  Scenario: Get existing agent
    When I call createAgent with the saved imageId
    And I save response.agentId as "agentId"
    And I call getAgent with the saved agentId
    Then the response should succeed
    And response.exists should be truthy
    And response.agent.agentId should be "${agentId}"

  @get
  Scenario: Get non-existent agent
    When I call getAgent with id "non-existent-agent-id"
    Then the response should succeed
    And response.exists should be falsy
