Feature: Error Handling and Recovery
  As a developer
  I want robust error handling across all layers
  So that my application can gracefully handle failures

  Background:
    Given I create and initialize an agent

  Scenario: Driver throws error during message sending
    When I send message "Trigger driver error"
    And the driver throws error "Network timeout"
    Then I should receive "error_message" event
    And the error event should contain:
      | field     | value            |
      | message   | Network timeout  |
      | severity  | error            |
    And the error should be logged
    And the agent should remain operational

  Scenario: Driver connection lost during streaming
    When I send message "Long response"
    And the driver starts streaming
    And the driver connection is lost
    Then I should receive "error_message" event
    And the error should indicate connection loss
    And the partial response should be preserved

  Scenario: Invalid driver configuration
    Given I create an agent with invalid driver
    When I try to initialize the agent
    Then the initialization should fail
    And it should throw a configuration error

  Scenario: Reactor throws error during initialization
    Given I create a reactor that throws error in initialize()
    When I create agent with this reactor and initialize
    Then the agent initialization should fail
    And the error should be logged with reactor context
    And the error message should include reactor name

  Scenario: Reactor throws error during event processing
    Given I create a reactor that throws error when processing events
    And I create and initialize an agent with this reactor
    When I send a message
    And the reactor encounters an error
    Then the error should be logged
    And the error should not crash the agent
    And other reactors should continue working
    And I should receive "error_message" event

  Scenario: EventBus error propagation
    When an error occurs in the event bus
    Then the error should be logged
    And I should receive "error_message" event
    And the event bus should continue operating

  Scenario: Abort during message processing
    When I send message "Long task"
    And the driver starts processing
    And I call abort()
    Then the driver should stop processing
    And I should receive "stream_complete" event
    And no error should be thrown
    And the agent should be ready for next message

  Scenario: Memory cleanup on error
    When I send message "Cause memory leak"
    And an error occurs during processing
    And I destroy the agent
    Then all subscriptions should be cleaned up
    And no memory leaks should occur
    And the driver should be properly destroyed

  Scenario: Logger throws error
    Given I create an agent with a faulty logger
    When the agent tries to log a message
    And the logger throws an error
    Then the agent should continue operating
    And the logging error should be silently ignored

  Scenario: Multiple concurrent errors
    When multiple reactors throw errors simultaneously
    Then all errors should be logged
    And I should receive multiple "error_message" events
    And the agent should remain stable
    And the error count should match the number of failures

  Scenario: Recover from error and continue
    Given I send message "Cause error"
    And I receive an error_message event
    When I send a new message "Normal request"
    Then the agent should process the message normally
    And I should receive a successful response
    And the error should not affect subsequent operations

  Scenario: Validation errors
    When I try to send message with invalid format
    Then I should receive a validation error
    And the error should indicate what validation failed
    And the invalid message should not be added to history
