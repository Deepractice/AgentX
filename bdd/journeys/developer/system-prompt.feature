@journey @developer
Feature: System Prompt
  A developer wants to control how the agent behaves
  by setting a system prompt.

  Scenario: Agent follows system prompt instructions
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "ChineseBot" in "my-app" with prompt "You must always reply in Chinese, no matter what language the user uses."
    And I run the image as an agent

    # Phase 2: Chat in English, expect Chinese reply
    When I send message "Hello, how are you?"
    Then I should receive a non-empty reply
    And the reply should contain a Chinese character

    # Phase 3: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
