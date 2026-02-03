@event @turn @pending
Feature: Event Turn Subscription
  As a developer using AgentX
  I want to subscribe to turn events
  So that I can track usage metrics

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  Scenario: Receive turn_complete event after response
    When I subscribe to "turn_complete" events
    And I send message "Say hello" to the saved agent
    Then I should receive a "turn_complete" event within 15 seconds
