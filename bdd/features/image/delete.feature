@image
Feature: Image Delete API
  As a developer using AgentX
  I want to delete images
  So that I can clean up agent configurations

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id
    And I call createImage in the saved container
    And I save response.record.imageId as "imageId"

  @delete
  Scenario: Delete existing image
    When I call deleteImage with the saved imageId
    Then the response should succeed
    When I call getImage with the saved imageId
    Then response.record should be falsy

  @delete
  Scenario: Delete non-existent image succeeds (idempotent)
    When I call deleteImage with id "non-existent-image-id"
    Then the response should succeed
