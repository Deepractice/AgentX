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

  Scenario: Messages delivered through Queue (uses default mock scenario)
    Given a remote client connected to "ws://localhost:15300"
    And client is subscribed to "chat" text_delta events

    When client sends message "Test" to image "chat"

    Then client should receive at least 1 text_delta event
    And text content should not be empty

  # ============================================================================
  # Multi-Consumer Independence
  # ============================================================================

  Scenario: Multiple clients receive same stream independently
    Given a remote client "A" connected to "ws://localhost:15300"
    And a remote client "B" connected to "ws://localhost:15300"
    And client "A" is subscribed to "chat" text_delta events
    And client "B" is subscribed to "chat" text_delta events

    When any client sends message "Test" to image "chat"

    Then client "A" should receive at least 1 text_delta event
    And client "B" should receive at least 1 text_delta event
    And both clients should receive same text

  # ============================================================================
  # Disconnect During Streaming
  # ============================================================================

  Scenario: Client receives messages through Queue
    Given a remote client connected to "ws://localhost:15300"
    And client is subscribed to "chat" text_delta events

    When client sends message "Hello" to image "chat"

    Then client should receive at least 1 text_delta event within 2 seconds
