Feature: Agent Interrupt
  As a developer
  I want to interrupt agent processing
  So that I can stop long-running operations

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"
    And an agent is created

  # ==================== Basic Interrupt ====================

  Scenario: Interrupt idle agent does nothing
    Given the agent state is "idle"
    When I call interrupt
    Then nothing should happen
    And the agent state should remain "idle"

  Scenario: Interrupt while thinking
    Given the driver will delay response for 1000ms
    And I send message "Hello" without waiting
    And the agent state becomes "thinking"
    When I call interrupt
    Then the driver interrupt should be called
    And the agent state should become "idle"

  Scenario: Interrupt while responding
    Given the driver will produce slow text deltas
    And I send message "Hello" without waiting
    And the agent state becomes "responding"
    When I call interrupt
    Then the driver interrupt should be called
    And the agent state should become "idle"

  Scenario: Interrupt while planning tool
    Given the driver will produce a slow tool call
    And I send message "Use tool" without waiting
    And the agent state becomes "planning_tool"
    When I call interrupt
    Then the driver interrupt should be called
    And the agent state should become "idle"

  Scenario: Interrupt while awaiting tool result
    Given the driver produced a tool call
    And the agent state is "awaiting_tool_result"
    When I call interrupt
    Then the agent state should become "idle"
    And pending tool execution should be cancelled

  # ==================== Interrupt and Queue ====================

  Scenario: Interrupt processes next queued message
    Given the driver will delay response for 1000ms
    And I send message "First" without waiting
    And I send message "Second" without waiting
    When I call interrupt
    And I wait for processing to complete
    Then "First" message should be interrupted
    And "Second" message should be processed normally

  Scenario: Interrupt clears current but not queue
    Given the driver will delay response for 500ms
    And I send message "First" without waiting
    And I send message "Second" without waiting
    And I send message "Third" without waiting
    When I call interrupt
    Then the messageQueue length should be 2
    And the driver should start processing "Second"

  # ==================== Interrupt Events ====================

  Scenario: Interrupt emits state change event
    Given I subscribe to state changes
    And the driver will delay response for 1000ms
    And I send message "Hello" without waiting
    When I call interrupt
    Then I should receive a state change to "idle"

  Scenario: Receive promise rejects on interrupt
    Given the driver will delay response for 1000ms
    When I send message "Hello"
    And I call interrupt during processing
    Then the receive promise should reject with interrupted error

  # ==================== Multiple Interrupts ====================

  Scenario: Multiple interrupts are idempotent
    Given the driver will delay response for 1000ms
    And I send message "Hello" without waiting
    When I call interrupt
    And I call interrupt again
    And I call interrupt again
    Then the driver interrupt should be called only once
    And the agent should be in "idle" state
