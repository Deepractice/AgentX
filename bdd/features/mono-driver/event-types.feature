@mono-driver @vcr
Feature: MonoDriver Event Types
  As a developer using MonoDriver
  I want to verify all expected event types are emitted
  So that the Driver contract is correctly implemented

  Background:
    Given I have a MonoDriver with provider "anthropic"

  Scenario: Event sequence follows the expected order
    When I send message "Say hi" to the driver
    Then the first driver event should be "message_start"
    And the last driver event should be "message_stop"
    And "text_delta" events should appear between "message_start" and "message_stop"

  Scenario: message_start event contains model info
    When I send message "Hello" to the driver
    Then I should receive a "message_start" driver event
    And the "message_start" event should have a non-empty "messageId"
    And the "message_start" event should have a non-empty "model"
