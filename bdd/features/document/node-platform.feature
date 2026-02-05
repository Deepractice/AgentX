@document @node-platform
Feature: NodePlatform (Documentation)
  Validates code examples from the @agentxjs/node-platform README.
  NodePlatform handles persistence and event bus.

  Scenario: Create platform with default options
    When I create a NodePlatform with default options
    Then the platform should have a containerRepository
    And the platform should have an imageRepository
    And the platform should have a sessionRepository
    And the platform should have an eventBus

  Scenario: Create platform with custom data path
    Given a temporary directory for data
    When I create a NodePlatform with dataPath set to the temp directory
    Then the platform should be created successfully
    And the SQLite database should exist in the data directory

  Scenario: Platform does not contain createDriver
    When I create a NodePlatform with default options
    Then the platform should NOT have a createDriver property
