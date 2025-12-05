Feature: Agent Middleware and Interceptor
  As a developer
  I want to intercept messages and events
  So that I can add cross-cutting concerns

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"
    And an agent is created

  # ==================== Middleware (Input Side) ====================

  Scenario: Middleware intercepts incoming message
    Given I add a middleware that logs messages
    When I send message "Hello"
    Then the middleware should receive the message before driver

  Scenario: Middleware can modify message
    Given I add a middleware that prepends "PREFIX: " to content
    When I send message "Hello"
    Then the driver should receive message with content "PREFIX: Hello"

  Scenario: Middleware can block message
    Given I add a middleware that blocks messages containing "spam"
    When I send message "This is spam"
    Then the driver should not receive the message
    And the receive promise should resolve

  Scenario: Multiple middlewares execute in order
    Given I add middleware A that appends "[A]"
    And I add middleware B that appends "[B]"
    When I send message "Hello"
    Then the driver should receive message with content "Hello[A][B]"

  Scenario: Middleware can be async
    Given I add an async middleware that delays 50ms
    When I send message "Hello"
    Then the message should be delayed by at least 50ms

  Scenario: Remove middleware with unsubscribe
    Given I add a middleware that modifies messages
    And I receive the unsubscribe function
    When I call unsubscribe
    And I send message "Hello"
    Then the driver should receive unmodified message

  # ==================== Interceptor (Output Side) ====================

  Scenario: Interceptor intercepts outgoing events
    Given I add an interceptor that logs events
    When the driver produces events
    Then the interceptor should receive events before handlers

  Scenario: Interceptor can modify events
    Given I add an interceptor that masks sensitive data in text_delta
    And I subscribe to "text_delta" events
    When the driver produces text_delta with "secret: abc123"
    Then I should receive text_delta with "secret: ***"

  Scenario: Interceptor can block events
    Given I add an interceptor that blocks error events
    And I subscribe to all events
    When the driver produces an error event
    Then I should not receive the error event

  Scenario: Multiple interceptors execute in order
    Given I add interceptor A that appends "[A]" to text
    And I add interceptor B that appends "[B]" to text
    And I subscribe to "text_delta" events
    When the driver produces text_delta with "Hello"
    Then I should receive text_delta with "Hello[A][B]"

  Scenario: Remove interceptor with unsubscribe
    Given I add an interceptor that modifies events
    And I receive the unsubscribe function
    And I subscribe to "text_delta" events
    When I call unsubscribe
    And the driver produces text_delta with "Hello"
    Then I should receive unmodified text_delta

  # ==================== Middleware + Interceptor Interaction ====================

  Scenario: Middleware and interceptor work together
    Given I add a middleware that logs "RECV: {message}"
    And I add an interceptor that logs "EMIT: {event}"
    When I send message "Hello"
    Then both middleware and interceptor should be called
