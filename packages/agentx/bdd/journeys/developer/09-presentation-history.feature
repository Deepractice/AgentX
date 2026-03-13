@journey @developer
Feature: Presentation History Restoration
  A developer uses the Presentation API to build a chat UI.
  When creating a Presentation for an agent with existing conversation history,
  getState() should immediately contain the historical messages.

  # Note: Currently only user messages are persisted by the Runtime.
  # When assistant message persistence is added, these scenarios
  # should be extended to verify assistant conversations too.

  Scenario: Presentation loads user message history for existing conversation
    # Phase 1: Setup and first conversation
    Given a local AgentX environment with provider "anthropic"
    When I create an image "HistoryBot" with prompt "You are a helpful assistant."
    And I run the image as an agent

    # Phase 2: Send a message (persists user message to session)
    When I send message "Remember the word: pineapple"
    Then I should receive a non-empty reply

    # Phase 3: Create a Presentation and verify history contains user message
    When I create a presentation for the agent
    Then the presentation state should have at least 1 conversation
    And conversation 1 should be a user message containing "pineapple"

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist

  Scenario: Presentation starts empty for new conversation
    Given a local AgentX environment with provider "anthropic"
    When I create an image "FreshBot" with prompt "You are a helpful assistant."
    And I run the image as an agent

    When I create a presentation for the agent
    Then the presentation state should have 0 conversations

    When I destroy the agent
    Then the agent should no longer exist
