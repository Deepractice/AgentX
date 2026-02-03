@journey @developer
Feature: First Conversation Journey
  As a developer using AgentX for the first time
  I want to create an agent and have a conversation
  So that I can understand the basic workflow

  @first-conversation
  Scenario: Complete first conversation workflow
    Given I create an AgentX client connected to the test server

    # Step 1: Create container
    When I call createContainer with a unique id
    Then the response should succeed

    # Step 2: Create image with configuration
    When I call createImage with name "Assistant" and systemPrompt "You are helpful. Keep responses brief."
    Then the response should succeed
    And I save response.record.imageId as "imageId"
    And I save response.record.sessionId as "sessionId"

    # Step 3: Create agent
    When I call createAgent with the saved imageId
    Then the response should succeed
    And I save response.agentId as "agentId"

    # Step 4: Subscribe to events
    When I subscribe to all events

    # Step 5: Send message
    When I send message "Hello!" to the saved agent
    Then the response should succeed

    # Step 6: Receive response
    Then I should receive an assistant message

    # Step 7: Cleanup
    When I call destroyAgent with the saved agentId
    Then the response should succeed

  @multi-turn
  Scenario: Multi-turn conversation
    Given I create an AgentX client connected to the test server
    And I have a running agent ready
    When I subscribe to all events

    # First turn
    When I send message "Remember: my name is Alice" to the saved agent
    Then I should receive an assistant message

    # Second turn - references first
    When I clear collected events
    And I send message "What is my name?" to the saved agent
    Then I should receive an assistant message
