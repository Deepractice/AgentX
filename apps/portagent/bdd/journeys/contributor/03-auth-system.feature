@journey @contributor
Feature: Authentication System
  As a contributor, I build the complete auth system,
  including first-run setup, login, and invite codes.

  # ============================================================================
  # User Journeys (Complete Flows)
  # ============================================================================

  @auth @setup
  Scenario: First-time admin setup journey
    # Fresh installation → setup → logged in as admin
    Given a fresh installation
    When I visit the homepage
    Then I should be on "/setup"
    And I should see "Create Admin Account"

    When I fill in email "admin@example.com"
    And I fill in password "admin123"
    And I click "Setup"
    Then I should be on "/"
    And I should be logged in as "admin"

    # Verify setup is now locked
    When I visit "/setup"
    Then I should be redirected to "/"

  @auth @login
  Scenario: User login journey
    # Existing user → login → chat page
    Given the system has admin "admin@example.com" with password "admin123"
    And I am not logged in

    When I visit the homepage
    Then I should be on "/login"

    When I fill in email "admin@example.com"
    And I fill in password "admin123"
    And I click "Login"
    Then I should be on "/"
    And I should see the chat interface

    # Verify session persists
    When I refresh the page
    Then I should still be on "/"
    And I should see the chat interface

  @auth @invite
  Scenario: Admin invites new user journey
    # Admin generates invite → new user signs up
    Given I am logged in as admin "admin@example.com"

    # Generate invite code
    When I visit "/admin/invites"
    Then I should see "Generate Invite Code"

    When I click "Generate"
    Then I should see a new invite code
    And I copy the invite code

    # Logout and signup as new user
    When I logout
    And I visit "/signup"
    Then I should see "Enter Invite Code"

    When I paste the invite code
    And I fill in email "newuser@example.com"
    And I fill in password "newuser123"
    And I click "Sign Up"
    Then I should be on "/"
    And I should be logged in as "user"

  @auth @access
  Scenario: Regular user cannot access admin pages
    Given I am logged in as user "regular@example.com"

    When I visit "/admin/invites"
    Then I should see "Access denied"
    And I should NOT see "Generate Invite Code"

  # ============================================================================
  # Data Model Reference
  # ============================================================================
  #
  # system_config
  # ├── initialized: boolean
  # └── initialized_at: timestamp
  #
  # users
  # ├── id
  # ├── email
  # ├── password_hash
  # ├── role: "admin" | "user"
  # └── created_at
  #
  # invite_codes
  # ├── code
  # ├── created_by (user_id)
  # ├── used_by (user_id, nullable)
  # ├── used_at (nullable)
  # └── created_at
