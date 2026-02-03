@journey @developer @tool-use @pending
Feature: Tool Use Conversation Journey
  As a developer using AgentX
  I want to use tool calls in conversations
  So that I can extend agent capabilities

  Scenario: Agent uses tool to get current time
    Given I create an AgentX client connected to the test server
    And I have a running agent ready
    When I subscribe to all events
    And I send message "What time is it?" to the saved agent
    Then I should receive a "tool_call" event within 15 seconds
    And I should receive an assistant message
