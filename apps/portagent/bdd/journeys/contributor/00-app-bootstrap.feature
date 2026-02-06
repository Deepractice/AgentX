@journey @contributor
Feature: App Bootstrap
  As a contributor, I need the portagent app to start correctly,
  so that I can begin developing features.

  Background:
    Given the portagent app is configured

  @bootstrap
  Scenario: Dev server starts and responds
    When I start the portagent dev server
    Then the server should be running on port 3000

  @bootstrap
  Scenario: Fresh install redirects to setup
    Given a fresh installation
    When I visit the homepage
    Then I should be on "/setup"
    And I should see "Create Admin Account"
