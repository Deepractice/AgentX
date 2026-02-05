@journey @developer
Feature: Session Resume
  A developer wants conversations to survive agent restarts.
  After destroying an agent and recreating it from the same image,
  the conversation history should be preserved automatically.

  Scenario: Agent remembers conversation after restart
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "MemoryBot" in "my-app" with prompt "You are a helpful assistant. Always include the user's name in your reply if you know it."
    And I run the image as an agent

    # Phase 2: First conversation
    When I send message "My name is Bob"
    Then I should receive a non-empty reply

    # Phase 3: Destroy and recreate agent from same image
    When I destroy the agent
    And I run the image as an agent

    # Phase 4: Verify memory survives restart
    When I send message "What is my name?"
    Then I should receive a non-empty reply
    And the reply should contain "Bob"

    # Phase 5: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
