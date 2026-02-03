@image
Feature: Image List API
  As a developer using AgentX
  I want to list images
  So that I can see available agent configurations

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id

  @list
  Scenario: List images returns array
    When I call listImages in the saved container
    Then the response should succeed
    And response.records should be truthy

  @list
  Scenario: List images includes created image
    When I call createImage in the saved container
    And I save response.record.imageId as "imageId"
    And I call listImages in the saved container
    Then the response should succeed
    And response.records should have length 1

  @list
  Scenario: List all images
    When I call createImage in the saved container
    And I call listImages
    Then the response should succeed
    And response.records should be truthy
