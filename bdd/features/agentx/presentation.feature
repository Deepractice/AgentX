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

  @vcr
  Scenario: Create presentation with initial state
    Given I create a presentation for agent "{presAgent}"
    Then the presentation state should have empty conversations
    And the presentation status should be "idle"

  @vcr
  Scenario: Send message adds user conversation immediately
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello!" via presentation
    Then the presentation should have 1 conversation
    And the first conversation should be from "user"
    And the first conversation should contain text "Hello!"

  @vcr
  Scenario: Reset presentation clears all state
    Given I create a presentation for agent "{presAgent}"
    When I send "Hello!" via presentation
    And I reset the presentation
    Then the presentation should have 0 conversations
    And the presentation status should be "idle"

  @vcr
  Scenario: Dispose presentation marks as disposed
    Given I create a presentation for agent "{presAgent}"
    When I dispose the presentation
    Then the presentation should be disposed
