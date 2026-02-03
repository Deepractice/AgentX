@agentx
Feature: AgentX Client Events
  As a developer using AgentX
  I want to subscribe to events
  So that I can receive notifications

  Background:
    Given I create an AgentX client connected to the test server

  @events
  Scenario: Subscribe to specific event type
    When I subscribe to "text_delta" events
    Then the client should be connected

  @events
  Scenario: Subscribe to all events
    When I subscribe to all events
    Then the client should be connected
