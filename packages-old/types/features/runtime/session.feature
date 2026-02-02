Feature: Session Lifecycle Management
  As a developer
  I want to manage sessions within containers
  So that I can persist conversation contexts

  Background:
    Given a runtime is initialized
    And a container "default" exists
    And an image "translator" exists

  # ==================== Create ====================

  Scenario: Create session in container
    When I create a session in container "default" with image "translator"
    Then the session should be created successfully
    And the session should have a unique ID
    And the session containerId should be "default"
    And the session imageId should be "translator"
    And the session createdAt should be set

  Scenario: Create session in non-existing container
    When I create a session in container "non-existing" with image "translator"
    Then it should fail with container not found error

  Scenario: Create session with non-existing image
    When I create a session in container "default" with image "non-existing"
    Then it should fail with image not found error

  # ==================== Get ====================

  Scenario: Get existing session
    Given a session exists in container "default" with image "translator"
    When I get the session by its ID
    Then I should receive the session info

  Scenario: Get non-existing session
    When I get session by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List sessions in empty container
    When I list sessions in container "default"
    Then I should receive an empty list

  Scenario: List sessions in container with sessions
    Given the following sessions exist in container "default":
      | image      |
      | translator |
      | assistant  |
    When I list sessions in container "default"
    Then I should receive 2 sessions

  Scenario: List sessions only returns sessions from specified container
    Given a container "other" exists
    And a session exists in container "default" with image "translator"
    And a session exists in container "other" with image "assistant"
    When I list sessions in container "default"
    Then I should receive 1 session

  # ==================== Delete ====================

  Scenario: Delete existing session
    Given a session exists in container "default" with image "translator"
    When I delete the session
    Then the delete should return true
    And the session should not exist

  Scenario: Delete non-existing session
    When I delete session "non-existing-id"
    Then the delete should return false

  # ==================== Run ====================

  Scenario: Run agent from session
    Given a session exists in container "default" with image "translator"
    When I run the session
    Then I should receive an agent ID
    And the agent should be running

  Scenario: Run non-existing session
    When I run session "non-existing-id"
    Then it should fail with session not found error
