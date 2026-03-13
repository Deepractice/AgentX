@journey @developer
Feature: Presentation Tool Call Display
  A developer uses the Presentation API to build a chat UI.
  When the agent uses tools, the Presentation state should contain
  tool blocks with populated toolInput and toolResult fields.

  # Bug context: MonoDriver emits { partialJson } but the reducer
  # was reading { delta }, causing toolInput to stay as empty {}.

  Scenario: Tool call block has populated toolInput and toolResult
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create an image "ToolBot" with prompt "You are a helpful assistant with bash access. When asked to run commands, always use the bash tool."
    And I run the image as an agent

    # Phase 2: Create presentation to observe tool blocks
    When I create a presentation for the agent

    # Phase 3: Send a message that triggers tool use
    When I send message via presentation "Use bash to run: echo tool-input-test"
    Then the presentation should have a completed tool block
    And the tool block toolInput should not be empty
    And the tool block toolResult should contain "tool-input-test"

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist

  Scenario: Multiple tool calls each have their own toolInput
    Given a local AgentX environment with provider "anthropic"
    When I create an image "MultiToolBot" with prompt "You are a helpful assistant with bash access. Always use bash tool when asked."
    And I run the image as an agent
    When I create a presentation for the agent

    When I send message via presentation "Use bash to run two commands separately: first 'echo aaa', then 'echo bbb'"
    Then the presentation should have at least 2 completed tool blocks
    And each tool block should have non-empty toolInput

    When I destroy the agent
    Then the agent should no longer exist
