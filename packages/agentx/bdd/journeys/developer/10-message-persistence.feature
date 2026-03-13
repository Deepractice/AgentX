@journey @developer
Feature: Message Persistence
  All conversation messages (user and assistant) should be persisted to the session.
  This ensures conversation history is complete for UI display and LLM context.

  Scenario: Assistant reply is persisted to session
    Given a local AgentX environment with provider "anthropic"
    When I create an image "PersistBot" with prompt "You are a helpful assistant."
    And I run the image as an agent

    When I send message "Hello"
    Then I should receive a non-empty reply

    When I check the session messages
    Then the session should contain a "user" message
    And the session should contain an "assistant" message

    When I destroy the agent
    Then the agent should no longer exist
