Feature: Agent Event Subscription
  As a developer
  I want to subscribe to agent events
  So that I can react to AI activities

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"
    And an agent is created

  # ==================== Subscribe All ====================

  Scenario: Subscribe to all events with handler
    Given I subscribe to all events with a handler
    When the driver produces events
    Then I should receive all events

  # ==================== Subscribe by Type ====================

  Scenario: Subscribe to specific event type
    Given I subscribe to "text_delta" events
    When the driver produces a text_delta event
    Then I should receive the text_delta event

  Scenario: Subscribe to event type that is not produced
    Given I subscribe to "tool_result" events
    When the driver produces only text events
    Then I should not receive any events

  Scenario: Subscribe to multiple event types with array
    Given I subscribe to ["text_delta", "message_stop"] events
    When the driver produces text_delta and message_stop events
    Then I should receive both event types

  # ==================== Subscribe with Map ====================

  Scenario: Subscribe with event handler map
    Given I subscribe with handler map:
      | event_type   |
      | text_delta   |
      | message_stop |
    When the driver produces various events
    Then only mapped event types should trigger handlers

  # ==================== React Style ====================

  Scenario: Subscribe with react-style handlers
    Given I subscribe with react handlers:
      | handler           |
      | onTextDelta       |
      | onMessageStop     |
    When the driver produces text_delta and message_stop events
    Then the corresponding react handlers should be called

  # ==================== State Change ====================

  Scenario: Subscribe to state changes
    Given I subscribe to state changes
    When I send a message and the agent processes it
    Then I should receive state change events with prev and current

  Scenario: State change shows correct transitions
    Given I subscribe to state changes
    And the driver will produce text response "Hello"
    When I send message "Hi"
    Then I should receive state changes:
      | prev      | current    |
      | idle      | thinking   |
      | thinking  | responding |
      | responding| idle       |

  # ==================== Unsubscribe ====================

  Scenario: Unsubscribe stops receiving events
    Given I subscribe to "text_delta" events
    And I receive the unsubscribe function
    When I call unsubscribe
    And the driver produces a text_delta event
    Then I should not receive any events

  Scenario: Multiple subscriptions are independent
    Given subscriber A subscribes to "text_delta" events
    And subscriber B subscribes to "text_delta" events
    When subscriber A unsubscribes
    And the driver produces a text_delta event
    Then subscriber B should still receive the event

  # ==================== Multiple Subscribers ====================

  Scenario: Multiple subscribers receive same events
    Given subscriber A subscribes to all events
    And subscriber B subscribes to all events
    When the driver produces events
    Then both subscribers should receive all events
