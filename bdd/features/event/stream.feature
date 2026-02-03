@event
Feature: Event Stream Subscription
  As a developer using AgentX
  I want to subscribe to stream events
  So that I can receive real-time updates

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  @stream
  Scenario: Subscribe to text_delta events
    When I subscribe to "text_delta" events
    And I send message "Say hello" to the saved agent
    Then I should receive a "text_delta" event within 10 seconds

  @stream
  Scenario: Subscribe to all events
    When I subscribe to all events
    And I send message "Say hello" to the saved agent
    Then I should have received at least 1 events in total
