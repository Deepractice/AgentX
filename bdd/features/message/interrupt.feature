@message
Feature: Message Interrupt API
  As a developer using AgentX
  I want to interrupt agent responses
  So that I can stop long-running operations

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  @interrupt
  Scenario: Interrupt agent
    When I interrupt the saved agent
    Then the response should succeed

  @interrupt
  Scenario: Interrupt specific agent
    When I interrupt agent "${agentId}"
    Then the response should succeed
