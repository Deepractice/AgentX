@reliability @multi-consumer
Feature: Multi-Consumer Support
  Multiple clients (tabs, devices, processes) can subscribe to the same
  conversation independently. Each consumer maintains its own read position.

  Background:
    Given an AgentX server is running on port 15300
    And container "workspace" exists
    And image "shared-chat" exists in container "workspace"

  # ============================================================================
  # Independent Consumption
  # ============================================================================

  Scenario: Two clients receive the same messages independently
    Given client "browser-tab-1" is connected and subscribed to "shared-chat"
    And client "browser-tab-2" is connected and subscribed to "shared-chat"
    When server sends message "hello" to image "shared-chat"
    Then client "browser-tab-1" should receive message "hello"
    And client "browser-tab-2" should receive message "hello"

  Scenario: Slow client does not block fast client
    Given client "fast" is connected and subscribed to "shared-chat"
    And client "slow" is connected and subscribed to "shared-chat"
    When server sends messages "A", "B", "C" to image "shared-chat"
    And client "fast" acknowledges all messages
    And client "slow" acknowledges only message "A"
    Then client "fast" read position should be at "C"
    And client "slow" read position should be at "A"

  Scenario: New client receives all historical messages
    Given client "existing" is connected and subscribed to "shared-chat"
    And server has sent messages "old-1", "old-2", "old-3" to image "shared-chat"
    And client "existing" has acknowledged all messages
    When client "new" connects and subscribes to "shared-chat"
    Then client "new" should receive messages "old-1", "old-2", "old-3"

  # ============================================================================
  # Browser Tab Isolation
  # ============================================================================

  @browser
  Scenario: Multiple browser tabs have independent cursors
    Given browser tab "tab-1" is connected with clientId "user_123:tab_abc"
    And browser tab "tab-2" is connected with clientId "user_123:tab_def"
    And both tabs are subscribed to "shared-chat"
    When server sends messages "M1", "M2", "M3" to image "shared-chat"
    And tab "tab-1" acknowledges up to "M2"
    And tab "tab-2" acknowledges up to "M1"
    Then tab "tab-1" unread count should be 1
    And tab "tab-2" unread count should be 2

  @browser
  Scenario: Closing one tab does not affect other tabs
    Given browser tab "tab-1" is connected and subscribed to "shared-chat"
    And browser tab "tab-2" is connected and subscribed to "shared-chat"
    And both tabs have received message "test"
    When tab "tab-1" is closed
    And server sends message "new" to image "shared-chat"
    Then tab "tab-2" should receive message "new"

  # ============================================================================
  # Cross-Device Sync
  # ============================================================================

  Scenario: Same user on different devices has independent positions
    Given device "phone" is connected with clientId "user_123:phone_001"
    And device "laptop" is connected with clientId "user_123:laptop_002"
    And both devices are subscribed to "shared-chat"
    When server sends 10 messages to image "shared-chat"
    And device "phone" reads 3 messages
    And device "laptop" reads 7 messages
    Then device "phone" should have 7 unread messages
    And device "laptop" should have 3 unread messages

  # ============================================================================
  # Consumer Lifecycle
  # ============================================================================

  Scenario: Disconnected client can resume from last position
    Given client "mobile" is connected and subscribed to "shared-chat"
    And client "mobile" has received and acknowledged 5 messages
    When client "mobile" disconnects
    And server sends 3 more messages to image "shared-chat"
    And client "mobile" reconnects and resubscribes to "shared-chat"
    Then client "mobile" should receive only the 3 new messages

  Scenario: Stale consumer is cleaned up after TTL
    Given client "abandoned" was connected and subscribed to "shared-chat"
    And client "abandoned" has been disconnected for 25 hours
    When cleanup runs
    Then client "abandoned" consumer record should be removed
    And messages should still exist for other consumers

  # ============================================================================
  # Topic Isolation
  # ============================================================================

  Scenario: Clients subscribed to different topics are isolated
    Given client "A" is subscribed to "chat-1"
    And client "B" is subscribed to "chat-2"
    When server sends message "for-chat-1" to image "chat-1"
    And server sends message "for-chat-2" to image "chat-2"
    Then client "A" should receive only "for-chat-1"
    And client "B" should receive only "for-chat-2"

  Scenario: One client can subscribe to multiple topics
    Given client "multi" is connected
    And client "multi" subscribes to "chat-1" and "chat-2"
    When server sends message "msg-1" to image "chat-1"
    And server sends message "msg-2" to image "chat-2"
    Then client "multi" should receive both messages
