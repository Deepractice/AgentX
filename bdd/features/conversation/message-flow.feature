@message @mock
Feature: Message Flow with Mock Environment
  Test complete message flow using MockEnvironment for fast, predictable results.

  Background:
    Given an AgentX instance with mock environment
    And container "workspace" exists
    And image "chat" exists in container "workspace"

  Scenario: Simple text response
    Given mock scenario is "default"
    And I am subscribed to "text_delta" events
    And I am subscribed to "message_start" events
    And I am subscribed to "message_stop" events

    When I call agentx.request("message_send_request", { imageId: "chat", content: "Hello" })

    Then I should receive "message_send_response"
    And I should receive "message_start" event
    And I should receive text deltas
    And I should receive "message_stop" event
    And text should be "Hello from mock!"

  Scenario: Multiple text deltas
    Given mock scenario is "multi-delta"
    And I am subscribed to "text_delta" events

    When I call agentx.request("message_send_request", { imageId: "chat", content: "Test" })

    Then I should receive "message_send_response"
    And I should receive exactly 5 "text_delta" events
    And text should be "Hello from mock!"

  Scenario: Long stream for reliability testing
    Given mock scenario is "long-stream"
    And I am subscribed to "text_delta" events

    When I call agentx.request("message_send_request", { imageId: "chat", content: "Tell me a story" })

    Then I should receive "message_send_response"
    And I should receive exactly 100 "text_delta" events

  Scenario: Instant response (no delays)
    Given mock scenario is "instant"
    And I am subscribed to "text_delta" events

    When I call agentx.request("message_send_request", { imageId: "chat", content: "Quick" })

    Then I should receive "message_send_response"
    And text should be "Instant response"
