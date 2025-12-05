Feature: Agent Message Receiving
  As a developer
  I want to send messages to agents
  So that I can have AI conversations

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"
    And an agent is created

  # ==================== Basic Receive ====================

  Scenario: Receive string message
    When I send message "Hello"
    Then the driver should receive a UserMessage with content "Hello"
    And the receive promise should resolve when processing completes

  Scenario: Receive UserMessage object
    Given a UserMessage with id "msg-1" and content "Hello"
    When I send the UserMessage
    Then the driver should receive the same UserMessage

  # ==================== State Transitions ====================

  Scenario: State transitions during simple response
    Given the driver will produce text response "Hi there"
    When I send message "Hello"
    Then the state should transition through:
      | state      |
      | thinking   |
      | responding |
      | idle       |

  Scenario: State transitions during tool use
    Given the driver will produce a tool call
    When I send message "What time is it?"
    Then the state should transition through:
      | state                |
      | thinking             |
      | planning_tool        |
      | awaiting_tool_result |
    And after tool result is provided
    Then the state should transition through:
      | state      |
      | thinking   |
      | responding |
      | idle       |

  # ==================== Message Queue ====================

  Scenario: Messages are queued when agent is processing
    Given the driver will delay response for 100ms
    When I send message "First" without waiting
    And I send message "Second" without waiting
    Then the messageQueue length should be 1
    And the messageQueue isEmpty should be false

  Scenario: Queued messages are processed in order
    Given the driver will echo back the message
    When I send message "First" without waiting
    And I send message "Second" without waiting
    And I send message "Third" without waiting
    And I wait for all messages to complete
    Then the driver should have received messages in order:
      | content |
      | First   |
      | Second  |
      | Third   |

  Scenario: Queue becomes empty after processing
    Given the driver will delay response for 50ms
    When I send message "First" without waiting
    And I send message "Second" without waiting
    And I wait for all messages to complete
    Then the messageQueue should be empty

  # ==================== Stream Events ====================

  Scenario: Driver stream events are forwarded to presenter
    Given the driver will produce text response "Hello"
    When I send message "Hi"
    Then the presenter should receive message_start event
    And the presenter should receive text_delta events
    And the presenter should receive message_stop event

  Scenario: Multiple text deltas are forwarded
    Given the driver will produce text deltas:
      | text    |
      | Hello   |
      | , world |
      | !       |
    When I send message "Hi"
    Then the presenter should receive 3 text_delta events
