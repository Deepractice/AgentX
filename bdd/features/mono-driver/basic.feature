@mono-driver @vcr
Feature: MonoDriver Basic Conversation
  As a developer using MonoDriver
  I want to send messages and receive streamed responses
  So that I can verify the Vercel AI SDK integration works correctly

  Background:
    Given I have a MonoDriver with provider "anthropic"

  Scenario: Send message and receive streamed response
    When I send message "Say hello in one word" to the driver
    Then I should receive a "message_start" driver event
    And I should receive "text_delta" driver events
    And I should receive a "message_stop" driver event with stopReason "end_turn"

  Scenario: Response contains non-empty text
    When I send message "What is 2+2? Answer with just the number." to the driver
    Then I should receive "text_delta" driver events
    And the combined text delta should not be empty

  Scenario: Driver state transitions correctly
    Then the driver state should be "idle"
    When I send message "Hi" to the driver
    Then the driver state should be "idle"
