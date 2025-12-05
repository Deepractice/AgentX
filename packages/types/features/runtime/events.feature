Feature: Runtime Event Subscription
  As a developer
  I want to subscribe to runtime events
  So that I can react to agent activities

  Background:
    Given a runtime is initialized with MockEnvironment
    And a container "default" exists
    And an image "translator" exists
    And a session exists in container "default" with image "translator"

  # ==================== Subscribe by Type ====================

  Scenario: Subscribe to specific event type
    Given I subscribe to "text_delta" events
    When an agent runs and produces text
    Then I should receive "text_delta" events

  Scenario: Subscribe to multiple event types
    Given I subscribe to "text_delta" events
    And I subscribe to "assistant_message" events
    When an agent runs and produces text
    Then I should receive both event types

  # ==================== Subscribe All ====================

  Scenario: Subscribe to all events
    Given I subscribe to all events
    When an agent runs and produces text
    Then I should receive all event types

  # ==================== Unsubscribe ====================

  Scenario: Unsubscribe stops receiving events
    Given I subscribe to "text_delta" events
    When I unsubscribe
    And an agent runs and produces text
    Then I should not receive any events

  # ==================== Multiple Subscribers ====================

  Scenario: Multiple subscribers receive same events
    Given subscriber A subscribes to "text_delta" events
    And subscriber B subscribes to "text_delta" events
    When an agent runs and produces text
    Then both subscribers should receive the events
