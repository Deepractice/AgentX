@agent
Feature: Agent List API
  As a developer using AgentX
  I want to list agents
  So that I can see running agents

  Background:
    Given I create an AgentX client connected to the test server
    And I have a container and image ready

  @list
  Scenario: List agents returns array
    When I call listAgents
    Then the response should succeed
    And response.agents should be truthy

  @list
  Scenario: List agents includes created agent
    When I call createAgent with the saved imageId
    And I save response.agentId as "agentId"
    And I call listAgents in the saved container
    Then the response should succeed
    And response.agents should have length 1

  @list
  Scenario: List all agents
    When I call createAgent with the saved imageId
    And I call listAgents
    Then the response should succeed
    And response.agents should be truthy
