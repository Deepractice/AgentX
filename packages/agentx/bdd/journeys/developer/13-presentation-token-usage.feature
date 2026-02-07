@journey @developer
Feature: Presentation Token Usage
  A developer uses the Presentation API to build a chat UI.
  When the agent responds, the Presentation state should contain
  real-time token usage data at the message level.

  # Token usage flows through the pipeline:
  # Driver (finish-step) → message_delta event → Reducer → PresentationState

  Scenario: Presentation state includes token usage after agent response
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "TokenBot" in "my-app" with prompt "You are a helpful assistant. Reply briefly."
    And I run the image as an agent
    When I create a presentation for the agent

    When I send message via presentation "Say hello"
    Then the presentation should have completed conversations
    And the last assistant conversation should have usage with inputTokens > 0
    And the last assistant conversation should have usage with outputTokens > 0

    When I destroy the agent
    Then the agent should no longer exist

  Scenario: Token usage accumulates across tool call steps
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "ToolTokenBot" in "my-app" with prompt "You are a helpful assistant with bash access. When asked to run commands, always use the bash tool."
    And I run the image as an agent
    When I create a presentation for the agent

    When I send message via presentation "Use bash to run: echo token-test"
    Then the presentation should have completed conversations
    And the last assistant conversation should have usage with inputTokens > 0
    And the last assistant conversation should have usage with outputTokens > 0

    When I destroy the agent
    Then the agent should no longer exist
