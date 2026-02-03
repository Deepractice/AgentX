@journey @operator
Feature: Image Management Journey
  As an operator managing AgentX
  I want to manage agent images
  So that I can configure different agent types

  Background:
    Given I create an AgentX client connected to the test server
    When I call createContainer with a unique id

  @image-management
  Scenario: Create and manage multiple images
    # Create multiple images with different configurations
    When I create 3 images with different configurations
    Then there should be 3 images in the container

    # Delete all images
    When I delete all created images
    Then there should be 0 images in the container

  @image-lifecycle
  Scenario: Image lifecycle management
    When I call createImage with name "Test Agent" and systemPrompt "You are a test agent"
    And I save response.record.imageId as "imageId"
    Then there should be 1 images in the container

    When I call deleteImage with the saved imageId
    Then there should be 0 images in the container

  @cleanup
  Scenario: Complete cleanup workflow
    # Setup
    When I call createImage in the saved container
    And I save response.record.imageId as "imageId"
    And I call createAgent with the saved imageId
    And I save response.agentId as "agentId"
    Then there should be 1 running agents
    And there should be 1 images in the container

    # Cleanup
    When I destroy all created agents
    And I delete all created images
    Then all resources should be cleaned up
