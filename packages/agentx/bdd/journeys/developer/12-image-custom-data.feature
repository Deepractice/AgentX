@journey @developer
Feature: Image Custom Data
  A developer wants to attach arbitrary custom data to images,
  so applications can store favorites, sort order, tags, or any
  app-specific metadata without modifying the core schema.

  Scenario: Create image with custom data
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Assistant" with customData:
      | key       | value |
      | favorited | true  |
      | sortOrder | 1     |
    Then the image customData "favorited" should be "true"
    And the image customData "sortOrder" should be "1"

  Scenario: Update image custom data
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Assistant"
    And I update the image customData:
      | key       | value |
      | favorited | true  |
      | tags      | work  |
    Then the image customData "favorited" should be "true"
    And the image customData "tags" should be "work"

  Scenario: Custom data persists after image reload
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Assistant" with customData:
      | key       | value |
      | favorited | true  |
    And I reload the image by id
    Then the image customData "favorited" should be "true"

  Scenario: Image without custom data works normally
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Assistant"
    Then the image should have no customData

  Scenario: Custom data appears in image list
    Given a local AgentX environment with provider "anthropic"
    When I create an image "StarredChat" with customData:
      | key       | value |
      | favorited | true  |
    And I create an image "NormalChat"
    When I list images
    Then the image list should contain "StarredChat" with customData "favorited" = "true"
    And the image list should contain "NormalChat" without customData "favorited"
