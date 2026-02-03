@journey @operator
Feature: Agent Management Journey
  As an operator managing AgentX
  I want to manage multiple agents
  So that I can control resource usage

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id
    And I call createImage in the saved container
    And I save response.record.imageId as "imageId"

  @agent-management
  Scenario: Create and manage multiple agents
    # Create multiple agents
    When I create 3 agents
    Then there should be 3 running agents

    # Destroy all agents
    When I destroy all created agents
    Then there should be 0 running agents

  @agent-lifecycle
  Scenario: Agent lifecycle management
    When I call createAgent with the saved imageId
    And I save response.agentId as "agentId"
    Then the agent "${agentId}" should exist

    When I call destroyAgent with the saved agentId
    Then the agent "${agentId}" should not exist
