@journey @maintainer
Feature: Naming and Tagging Conventions
  As a maintainer, I enforce consistent conventions,
  so the codebase stays organized as it grows.

  Scenario: Journey files follow naming conventions
    Given a journey feature file
    Then the filename should use numbered prefix with hyphenated description:
      | pattern                     | meaning                            |
      | NN-description.feature      | NN = two-digit sequence number     |
    Examples:
      | good                           | bad                       |
      | 01-bdd-workflow.feature        | bdd-workflow.feature      |
      | 04-chat-ui.feature             | ChatUI.feature            |
      | 00-app-bootstrap.feature       | app_bootstrap.feature     |
    And the number reflects the logical reading order, not priority

  Scenario: Features have correct tags
    Given a journey feature file
    Then it must have "@journey" tag
    And it should have a role tag:
      | tag           | who                          |
      | @contributor  | Building the project         |
      | @developer    | Using the SDK                |
      | @user         | Using the app                |
      | @maintainer   | Maintaining the monorepo     |
    And it may have "@pending" for unimplemented features
    And it may have "@ui" for browser-tested scenarios

  Scenario: Scenarios describe goals not implementation
    Given a journey scenario
    Then it should describe "what" the user achieves
    And not "how" it is technically implemented
    Examples:
      | good                                  | bad                                |
      | I should receive a non-empty reply    | The API should return 200 OK       |
      | The agent should remember my name     | SQLite should persist the session  |

  Scenario: Journeys are independently runnable
    Given any single journey feature file
    When I run it in isolation
    Then it should pass without depending on other journeys
