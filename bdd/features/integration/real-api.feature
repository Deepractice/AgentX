@integration @real-api
Feature: Real API Integration Tests
  Test with actual Claude API to capture real event flows.
  These tests are slow and require API key - run manually.

  @capture-events
  Scenario: Capture real API event flow
    Given a remote client connected to test server
    And client creates container "capture" on server
    And client creates image "chat" in container "capture"
    And event recorder is enabled
    And client is subscribed to "chat" events for recording

    When client sends message "Say hello in 5 words"

    Then client should receive message_start event
    And client should receive text_delta events
    And client should receive message_stop event
    And event flow should be recorded to file

  @disconnect-recovery
  Scenario: Disconnect during real API streaming recovers messages
    Given a remote client connected to test server
    And client creates container "test-ws" on server
    And client creates image "chat" in container "test-ws"
    And client is subscribed to "chat" events

    When client sends message "Count from 1 to 10"
    And client waits for 3 text_delta events
    And client disconnects
    And wait 3 seconds for API to finish
    And client reconnects
    And client resubscribes to "chat" events

    Then client should eventually receive all text_delta events
    And no text_delta events should be missing
    And message should contain "10"
