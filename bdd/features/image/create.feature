@image
Feature: Image Create API
  As a developer using AgentX
  I want to create images
  So that I can define agent configurations

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id

  @create
  Scenario: Create image with minimal params
    When I call createImage in the saved container
    Then the response should succeed
    And response.record.imageId should be truthy
    And response.record.containerId should be "${containerId}"
    And response.record.sessionId should be truthy

  @create
  Scenario: Create image with name and systemPrompt
    When I call createImage with name "Assistant" and systemPrompt "You are helpful"
    Then the response should succeed
    And response.record.name should be "Assistant"
    And response.record.systemPrompt should be "You are helpful"

  @create
  Scenario: Create image with full configuration
    When I call createImage with:
      | key          | value                    |
      | containerId  | ${containerId}           |
      | name         | My Assistant             |
      | description  | A test assistant         |
      | systemPrompt | You are a test assistant |
    Then the response should succeed
    And response.record.name should be "My Assistant"
    And response.record.description should be "A test assistant"
