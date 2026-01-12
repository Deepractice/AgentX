@reliability @reconnect
Feature: Reconnection and Message Recovery
  When a client disconnects and reconnects, it should receive any messages
  that were sent during the disconnection period. No messages should be lost.

  Background:
    Given an AgentX server is running on port 15300
    And a remote AgentX client connected to "ws://localhost:15300"
    And container "workspace" exists
    And image "chat" exists in container "workspace"

  # ============================================================================
  # Basic Reconnection
  # ============================================================================

  Scenario: Client reconnects automatically after network drop
    When the network connection is dropped
    Then the client should reconnect within 5 seconds
    And the client should be connected

  Scenario: Client can send requests after reconnection
    Given the network connection was dropped and restored
    When I call agentx.request("container_list_request", {})
    Then I should receive "container_list_response"

  # ============================================================================
  # Message Recovery - Core Reliability
  # ============================================================================

  Scenario: Messages sent during disconnection are received after reconnect
    Given I am subscribed to events for image "chat"
    And I have received 3 messages
    When the network connection is dropped
    And server sends message "missed-1" to image "chat"
    And server sends message "missed-2" to image "chat"
    And the network connection is restored
    Then I should receive message "missed-1"
    And I should receive message "missed-2"
    And no messages should be lost

  Scenario: Message order is preserved after reconnection
    Given I am subscribed to events for image "chat"
    When the network connection is dropped
    And server sends messages "A", "B", "C" to image "chat" in order
    And the network connection is restored
    Then I should receive messages in order "A", "B", "C"

  Scenario: Already received messages are not duplicated
    Given I am subscribed to events for image "chat"
    And I have received message "msg-1"
    When the network connection is dropped
    And server sends message "msg-2" to image "chat"
    And the network connection is restored
    Then I should receive message "msg-2"
    And I should NOT receive message "msg-1" again

  # ============================================================================
  # Cursor Persistence
  # ============================================================================

  Scenario: Client cursor is preserved across reconnections
    Given I am subscribed to events for image "chat"
    And I have received and acknowledged 5 messages
    When the network connection is dropped
    And the network connection is restored
    Then the server should resume from my last acknowledged position

  @browser
  Scenario: Client cursor survives page refresh (browser)
    Given I am subscribed to events for image "chat"
    And I have received and acknowledged 3 messages
    When I refresh the page
    And I reconnect to the server
    And I subscribe to events for image "chat"
    Then I should resume from my last acknowledged position
    And I should NOT receive the first 3 messages again

  # ============================================================================
  # Edge Cases
  # ============================================================================

  Scenario: Long disconnection with many messages
    Given I am subscribed to events for image "chat"
    When the network connection is dropped
    And server sends 100 messages to image "chat"
    And the network connection is restored
    Then I should receive all 100 messages
    And no messages should be lost

  Scenario: Rapid disconnect/reconnect cycles
    Given I am subscribed to events for image "chat"
    When I disconnect and reconnect 5 times rapidly
    And server sends message "test" to image "chat"
    Then I should receive message "test" exactly once

  Scenario: Server restart during client disconnection
    Given I am subscribed to events for image "chat"
    And I have received 3 messages
    When the network connection is dropped
    And the server restarts
    And server sends message "after-restart" to image "chat"
    And the network connection is restored
    Then I should receive message "after-restart"
