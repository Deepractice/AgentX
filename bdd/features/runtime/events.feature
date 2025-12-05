Feature: Runtime Events
  As a developer using the Runtime
  I want to subscribe to various runtime events
  So that I can react to system activities in real-time

  Background:
    Given a Runtime instance is created

  # ============================================================================
  # Event Subscription
  # ============================================================================

  Rule: Event Subscription Mechanism

    Scenario: Subscribe to all runtime events
      When I subscribe to runtime events
      And an event is emitted
      Then I should receive the event

    Scenario: Unsubscribe from events
      Given I am subscribed to runtime events
      When I unsubscribe from runtime events
      And an event is emitted
      Then I should not receive any events

    Scenario: Multiple subscribers receive the same event
      Given subscriber "A" is subscribed to runtime events
      And subscriber "B" is subscribed to runtime events
      When an event is emitted
      Then subscriber "A" should receive the event
      And subscriber "B" should receive the event

  # ============================================================================
  # Environment Events (LLM Stream)
  # ============================================================================

  Rule: Driveable Events from LLM

    Scenario: Receive message_start event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When the LLM starts a message for agent "agent-1"
      Then I should receive event with type "message_start"
      And the event should have source "environment"

    Scenario: Receive text_delta event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When the LLM streams text "Hello" for agent "agent-1"
      Then I should receive event with type "text_delta"
      And the event data should contain text "Hello"

    Scenario: Receive message_stop event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When the LLM completes a message for agent "agent-1"
      Then I should receive event with type "message_stop"

    Scenario: Receive interrupted event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When agent "agent-1" is interrupted
      Then I should receive event with type "interrupted"

  # Note: Connection events (connected, disconnected, reconnecting) are Mirror events,
  # not Runtime events. They should be tested in Mirror tests.

  # ============================================================================
  # Container Events
  # ============================================================================

  Rule: Container Lifecycle Events

    Scenario: Receive container_created event
      Given I am subscribed to runtime events
      When I create a container with id "container-1"
      Then I should receive event with type "container_created"
      And the event context should have containerId "container-1"

    Scenario: Receive container_destroyed event
      Given a container "container-1" exists
      And I am subscribed to runtime events
      When I dispose the container "container-1"
      Then I should receive event with type "container_destroyed"
      And the event context should have containerId "container-1"

    Scenario: Receive agent_registered event
      Given a container "container-1" exists
      And I am subscribed to runtime events
      When I run an agent in container "container-1"
      Then I should receive event with type "agent_registered"
      And the event context should have containerId "container-1"

    Scenario: Receive agent_unregistered event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When I destroy the agent "agent-1"
      Then I should receive event with type "agent_unregistered"
      And the event context should have agentId "agent-1"

  # Note: Sandbox events (file_read_request, tool_execute_request) are request events
  # from Mirror. Runtime emits result events (file_read_result, tool_executed).
  # Request events should be tested in Mirror tests.

  # ============================================================================
  # Session Events
  # ============================================================================

  Rule: Session Lifecycle Events

    Scenario: Receive session_created event
      Given a container "container-1" exists
      And I am subscribed to runtime events
      When I run an agent in container "container-1"
      Then I should receive event with type "session_created"

    Scenario: Receive session_destroyed event
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When I destroy the agent "agent-1"
      Then I should receive event with type "session_destroyed"

  Rule: Session Action Events

    Scenario: Receive session_resumed event
      Given a container "container-1" exists
      And an agent "agent-1" is stopped in container "container-1"
      And I am subscribed to runtime events
      When I resume the agent "agent-1"
      Then I should receive event with type "session_resumed"

  # Note: session_save_request is a Mirror request event.
  # Runtime emits session_saved as result.

  # ============================================================================
  # Event Context
  # ============================================================================

  Rule: Events carry RuntimeContext

    Scenario: Events include containerId in context
      Given a container "container-1" exists
      And I am subscribed to runtime events
      When an event is emitted from container "container-1"
      Then the event context should have containerId "container-1"

    Scenario: Events include agentId in context
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I am subscribed to runtime events
      When an event is emitted from agent "agent-1"
      Then the event context should have agentId "agent-1"
      And the event context should have containerId "container-1"

  # ============================================================================
  # Event Classification
  # ============================================================================

  Rule: Events have proper classification

    Scenario: RuntimeEvent has source, category, and intent
      Given I am subscribed to runtime events
      When a runtime event is emitted
      Then the event should have property "source"
      And the event should have property "category"
      And the event should have property "intent"

    Scenario: Notification events have intent "notification"
      Given I am subscribed to runtime events
      When a container_created event is emitted
      Then the event should have intent "notification"
