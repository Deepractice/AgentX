@journey @developer
Feature: Multi-turn Chat
  A developer wants to verify that the agent remembers
  previous messages in a conversation.

  Scenario: Agent remembers context from previous messages
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "Assistant" in "my-app" with prompt "You are a helpful assistant. Reply briefly in one sentence."
    And I run the image as an agent

    # Phase 2: First turn — tell it something
    When I send message "My name is Alice"
    Then I should receive a non-empty reply

    # Phase 3: Follow-up — ask it to recall
    When I send message "What is my name? Please include my name in your reply."
    Then I should receive a non-empty reply
    And the reply should contain "Alice"

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
