@reliability @mock
Feature: Queue Message Delivery with Mock Environment
  Test Queue reliability using MockEnvironment for predictable message streams.
  This verifies true end-to-end flow: Agent → Queue → Remote Client.

  Background:
    Given an AgentX server is running on port 15300
    And container "workspace" exists
    And image "chat" exists in container "workspace"

  # ============================================================================
  # Message Order
  # ============================================================================

  Scenario: Messages delivered in order through Queue
    Given a remote client connected to "ws://localhost:15300"
    And client is subscribed to "chat" text_delta events
    And server mock scenario is "ordered-messages"

    When client sends message "Test" to image "chat"

    Then client should receive text_delta events in order: "1", "2", "3", "4", "5"

  # ============================================================================
  # Multi-Consumer Independence
  # ============================================================================

  Scenario: Multiple clients receive same stream independently
    Given a remote client "A" connected to "ws://localhost:15300"
    And a remote client "B" connected to "ws://localhost:15300"
    And client "A" is subscribed to "chat" text_delta events
    And client "B" is subscribed to "chat" text_delta events
    And server mock scenario is "multi-delta"

    When any client sends message "Test" to image "chat"

    Then client "A" should receive 5 text_delta events
    And client "B" should receive 5 text_delta events
    And both clients should receive same text

  # ============================================================================
  # Disconnect During Streaming
  # ============================================================================

  @slow
  Scenario: Disconnect during streaming recovers all messages
    Given a remote client connected to "ws://localhost:15300"
    And client is subscribed to "chat" text_delta events
    And server mock scenario is "slow-stream"

    When client sends message "Tell a story" to image "chat"
    And client waits for 10 text_delta events
    And client disconnects
    And wait 1 second for mock to finish emitting
    And client reconnects to "ws://localhost:15300"
    And client resubscribes to "chat" text_delta events

    Then client should eventually receive 50 total text_delta events
    And no events should be duplicated

  # ============================================================================
  # Long Stream (100 events)
  # ============================================================================

  Scenario: Queue handles long event stream
    Given a remote client connected to "ws://localhost:15300"
    And client is subscribed to "chat" text_delta events
    And server mock scenario is "long-stream"

    When client sends message "Long story" to image "chat"

    Then client should receive 100 text_delta events within 5 seconds
