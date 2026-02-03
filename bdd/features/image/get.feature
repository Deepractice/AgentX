@image
Feature: Image Get API
  As a developer using AgentX
  I want to get image information
  So that I can retrieve agent configurations

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id
    And I call createImage in the saved container
    And I save response.record.imageId as "imageId"

  @get
  Scenario: Get existing image
    When I call getImage with the saved imageId
    Then the response should succeed
    And response.record.imageId should be "${imageId}"

  @get
  Scenario: Get non-existent image returns null
    When I call getImage with id "non-existent-image-id"
    Then the response should succeed
    And response.record should be falsy
