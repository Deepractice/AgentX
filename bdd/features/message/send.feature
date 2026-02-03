@message
Feature: Message Send API
  As a developer using AgentX
  I want to send messages to agents
  So that I can have AI conversations

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  @send
  Scenario: Send text message to agent
    When I send message "Hello!" to the saved agent
    Then the response should succeed
    And response.agentId should be "${agentId}"

  @send
  Scenario: Send message to specific agent
    When I send message "Hello!" to agent "${agentId}"
    Then the response should succeed

  @send @pending
  Scenario: Send message to non-existent agent fails
    When I send message "Hello!" to agent "non-existent-agent"
    Then the response should have an error
