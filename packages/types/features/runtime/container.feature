Feature: Container Lifecycle Management
  As a developer
  I want to manage containers
  So that I can organize sessions in isolated environments

  Background:
    Given a runtime is initialized

  # ==================== Create ====================

  Scenario: Create container without name
    When I create a container
    Then the container should be created successfully
    And the container should have a unique ID
    And the container createdAt should be set

  Scenario: Create container with name
    When I create a container with name "my-workspace"
    Then the container should be created successfully
    And the container name should be "my-workspace"

  # ==================== Get ====================

  Scenario: Get existing container
    Given a container exists with name "workspace-1"
    When I get the container by its ID
    Then I should receive the container info

  Scenario: Get non-existing container
    When I get container by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List containers when empty
    When I list all containers
    Then I should receive an empty list

  Scenario: List multiple containers
    Given the following containers exist:
      | name        |
      | workspace-1 |
      | workspace-2 |
      | workspace-3 |
    When I list all containers
    Then I should receive 3 containers
