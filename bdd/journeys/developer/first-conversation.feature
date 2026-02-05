@journey @developer
Feature: First Conversation
  A developer discovers AgentX and wants to see it work.
  Setup a local environment, create an agent, and have a conversation.
  It should be that simple.

  Scenario: Create an agent and chat locally
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"

    # Phase 2: Create agent
    When I create a container "my-app"
    And I create an image "Assistant" in "my-app" with prompt "You are a helpful assistant. Reply briefly in one sentence."
    And I run the image as an agent

    # Phase 3: Chat
    When I send message "Hello, who are you?"
    Then I should receive a non-empty reply

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
