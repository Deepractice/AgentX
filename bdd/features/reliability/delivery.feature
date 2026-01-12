@reliability @delivery
Feature: Reliable Message Delivery
  Messages are durably stored and delivered at-least-once.
  The system guarantees no message loss under normal operating conditions.

  Background:
    Given an AgentX server is running on port 15240
    And container "workspace" exists
    And image "chat" exists in container "workspace"

  # ============================================================================
  # Delivery Guarantees
  # ============================================================================

  Scenario: Messages are persisted before acknowledgment
    Given a client is connected and subscribed to "chat"
    When server sends message "important" to image "chat"
    And the server crashes immediately after
    And the server restarts
    And the client reconnects
    Then the client should receive message "important"

  Scenario: Unacknowledged messages are redelivered
    Given a client is connected and subscribed to "chat"
    When server sends message "retry-me" to image "chat"
    And the client receives but does NOT acknowledge the message
    And the client reconnects
    Then the client should receive message "retry-me" again

  Scenario: Acknowledged messages are not redelivered
    Given a client is connected and subscribed to "chat"
    When server sends message "once-only" to image "chat"
    And the client receives and acknowledges the message
    And the client reconnects
    Then the client should NOT receive message "once-only" again

  # ============================================================================
  # Message Ordering
  # ============================================================================

  Scenario: Messages are delivered in order within a topic
    Given a client is connected and subscribed to "chat"
    When server sends messages "1", "2", "3", "4", "5" to image "chat" in rapid succession
    Then the client should receive messages in exact order "1", "2", "3", "4", "5"

  Scenario: Cursor advances monotonically
    Given a client is connected and subscribed to "chat"
    When server sends 10 messages to image "chat"
    Then each message cursor should be greater than the previous

  # ============================================================================
  # High Load Scenarios
  # ============================================================================

  @stress
  Scenario: System handles burst of messages
    Given a client is connected and subscribed to "chat"
    When server sends 1000 messages to image "chat" in 1 second
    Then the client should eventually receive all 1000 messages
    And no messages should be lost

  @stress
  Scenario: System handles many concurrent subscribers
    Given 50 clients are connected and subscribed to "chat"
    When server sends message "broadcast" to image "chat"
    Then all 50 clients should receive message "broadcast"

  # ============================================================================
  # Cleanup and Retention
  # ============================================================================

  Scenario: Old messages are cleaned up after all consumers acknowledge
    Given client "A" and client "B" are subscribed to "chat"
    And server has sent 100 messages to image "chat"
    When client "A" acknowledges all 100 messages
    And client "B" acknowledges all 100 messages
    And cleanup runs
    Then the 100 messages should be removed from storage

  Scenario: Messages are retained if any consumer has not acknowledged
    Given client "A" and client "B" are subscribed to "chat"
    And server has sent 10 messages to image "chat"
    When client "A" acknowledges all 10 messages
    And client "B" acknowledges only 5 messages
    And cleanup runs
    Then messages 6-10 should still exist in storage

  Scenario: Very old messages are force-cleaned after TTL
    Given client "stale" subscribed to "chat" 49 hours ago
    And client "stale" has not acknowledged any messages
    And server sent 10 messages 49 hours ago
    When cleanup runs
    Then the 10 messages should be removed (exceeded 48h TTL)

  # ============================================================================
  # Error Handling
  # ============================================================================

  Scenario: Invalid message format is rejected gracefully
    Given a client is connected
    When client sends malformed message
    Then the connection should remain open
    And subsequent valid messages should work

  Scenario: Subscribe to non-existent topic succeeds
    Given a client is connected
    When client subscribes to "non-existent-topic"
    Then subscription should succeed
    And client should receive future messages to that topic
