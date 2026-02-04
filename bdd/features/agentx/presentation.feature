@agentx @presentation
Feature: Presentation API
  As a developer
  I want to use the Presentation API for UI integration
  So that I can easily build chat interfaces without handling raw stream events

  Background:
    Given I have an AgentX client connected to the test server
    And I have created container "presentation-container"
    And I have created an image in container "presentation-container" with:
      | systemPrompt | You are a helpful assistant. Keep responses brief. |
    And I save the imageId as "presImage"
    And I have created an agent from image "{presImage}"
    And I save the agentId as "presAgent"

  # ===========================================================================
  # Basic State Management
  # ===========================================================================

  Scenario: Create presentation with initial state
    Given I create a presentation for agent "{presAgent}"
    Then the presentation state should have empty conversations
    And the presentation status should be "idle"
    And the presentation streaming should be null

  Scenario: Reset presentation clears all state
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello!" via presentation
    And I reset the presentation
    Then the presentation should have 0 conversations
    And the presentation status should be "idle"
    And the presentation streaming should be null

  Scenario: Dispose presentation marks as disposed
    Given I create a presentation for agent "{presAgent}"
    When I dispose the presentation
    Then the presentation should be disposed

  # ===========================================================================
  # Single Message Flow
  # ===========================================================================

  @vcr
  Scenario: Send message creates user and assistant conversations
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello!" via presentation
    Then the presentation should have 2 conversations
    And the first conversation should be from "user"
    And the first conversation should contain text "Hello!"
    And the second conversation should be from "assistant"
    And the second conversation should have text blocks

  @vcr
  Scenario: Assistant conversation is not streaming after completion
    Given I create a presentation for agent "{presAgent}"
    When I send "Say hi" via presentation
    Then the second conversation should not be streaming

  @vcr
  Scenario: Status returns to idle after response completes
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello" via presentation
    Then the presentation status should be "idle"

  # ===========================================================================
  # Multi-turn Conversations
  # ===========================================================================

  @vcr
  Scenario: Multiple messages accumulate in conversations
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello" via presentation
    And I send "How are you?" via presentation
    Then the presentation should have 4 conversations
    And conversation 1 should be from "user"
    And conversation 2 should be from "assistant"
    And conversation 3 should be from "user"
    And conversation 4 should be from "assistant"

  # ===========================================================================
  # State Update Callbacks
  # ===========================================================================

  @vcr
  Scenario: onUpdate callback receives state changes
    Given I create a presentation for agent "{presAgent}" with update tracking
    When I send "Hi" via presentation
    Then the update callback should have been called
    And the update callback should have received the final state

  # ===========================================================================
  # getState returns current snapshot
  # ===========================================================================

  Scenario: getState returns current state snapshot
    Given I create a presentation for agent "{presAgent}"
    Then getState should return empty conversations
    When I send "Test" via presentation
    Then getState should return 2 conversations
