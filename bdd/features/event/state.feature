@event @state @pending
Feature: Event State Subscription
  As a developer using AgentX
  I want to subscribe to state events
  So that I can track agent lifecycle

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  Scenario: Receive state events during conversation
    When I subscribe to "conversation_start" events
    And I subscribe to "conversation_end" events
    And I send message "Say hello" to the saved agent
    Then I should receive a "conversation_start" event
    And I should receive a "conversation_end" event within 15 seconds
