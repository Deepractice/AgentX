Feature: ClaudeAgent
  As a developer
  I want to use ClaudeAgent
  So that I can interact with Claude AI easily

  Background:
    Given I have a valid API key

  Scenario: Create a ClaudeAgent
    When I create a ClaudeAgent with the API key
    Then the agent should be created successfully
    And the agent should have a session ID

  Scenario: Initialize ClaudeAgent
    Given I have created a ClaudeAgent
    When I initialize the agent
    Then the agent should be ready to use

  Scenario: Send a message to ClaudeAgent
    Given I have initialized a ClaudeAgent
    When I send a message "Hello, Claude!"
    Then I should receive a response from Claude
    And the response should be an assistant message

  Scenario: Receive events from ClaudeAgent
    Given I have initialized a ClaudeAgent
    And I have registered an event handler for text deltas
    When I send a message "Say hi"
    Then I should receive text delta events
    And the text deltas should contain content

  Scenario: Agent composition - ClaudeAgent as Driver
    Given I have created a ClaudeAgent
    When I create a new agent using ClaudeAgent as the driver
    Then the new agent should work correctly
    And events should flow through both agents

  Scenario: Destroy ClaudeAgent
    Given I have initialized a ClaudeAgent
    When I destroy the agent
    Then the agent should be cleaned up successfully
