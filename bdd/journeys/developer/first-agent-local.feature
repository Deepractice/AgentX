@journey @developer
Feature: First Agent (Local Mode)
  A developer creates their first AI agent locally,
  has a conversation, and cleans up.

  Scenario: Complete local agent lifecycle
    # Phase 1: Initialize
    Given a local AgentX environment with provider "anthropic"

    # Phase 2: Create resources
    When I create a container "my-app"
    Then the container "my-app" should exist

    When I create an image "Assistant" in "my-app" with prompt "You are a helpful assistant. Reply briefly in one sentence."
    Then the image should be created with a valid ID

    # Phase 3: Run agent
    When I run the image as an agent
    Then the agent should be running

    # Phase 4: Conversation
    When I start listening for events
    And I send message "Hello, who are you?"
    Then I should receive the complete event stream
    And the response should contain non-empty text

    # Phase 5: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
