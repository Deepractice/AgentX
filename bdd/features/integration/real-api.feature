@integration @real-api
Feature: Real API Integration Tests
  Test with actual Claude API to capture real event flows.
  These tests are slow and require API key - run manually.

  Background:
    Given an AgentX instance with real API
    And container "integration" exists
    And image "test-chat" exists in container "integration"

  @capture-events
  Scenario: Capture real API event flow
    Given event recorder is enabled
    And I am subscribed to all events

    When I send message "Say hello in 5 words" to image "test-chat"

    Then I should receive "message_start" event
    And I should receive "text_delta" events
    And I should receive "message_stop" event
    And I should receive "assistant_message" event
    And event flow should be recorded to file

  @disconnect-recovery
  Scenario: Disconnect during real API streaming recovers messages
    Given a remote client connected to test server
    And client is subscribed to "test-chat" events

    When client sends message "Count from 1 to 10"
    And client waits for 3 text_delta events
    And client disconnects
    And wait 3 seconds for API to finish
    And client reconnects
    And client resubscribes to "test-chat" events

    Then client should eventually receive all text_delta events
    And no text_delta events should be missing
    And message should contain "10"
