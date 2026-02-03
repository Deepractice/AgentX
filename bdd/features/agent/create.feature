@agent
Feature: Agent Create API
  As a developer using AgentX
  I want to create agents
  So that I can run AI conversations

  Background:
    Given I create an AgentX client connected to the test server
    And I have a container and image ready

  @create
  Scenario: Create agent from image
    When I call createAgent with the saved imageId
    Then the response should succeed
    And response.agentId should be truthy
    And response.imageId should be "${imageId}"
    And response.containerId should be "${containerId}"
    And response.sessionId should be truthy

  @create
  Scenario: Create agent with custom agentId
    When I call createAgent with imageId "${imageId}" and agentId "my-custom-agent"
    Then the response should succeed
    And response.agentId should be "my-custom-agent"
