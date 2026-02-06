@journey @maintainer
Feature: BDD-Driven Development Workflow
  As a maintainer, I enforce BDD-first development,
  so every feature has a spec before any code is written.

  Scenario: New contributor learns the Iron Law
    Given a new contributor joins the project
    When they read the development guide
    Then they should understand:
      | rule                    | meaning                                      |
      | Scenario exists         | Implement according to it                    |
      | No scenario             | Write the feature first, then code           |
      | Unsure if allowed       | Check if a feature covers it                 |
    And they should never skip BDD and write code directly

  Scenario: Development follows the 4-step workflow
    Given a contributor has a new feature to build
    Then they should follow this workflow:
      | step | action                                  |
      | 1    | Write .feature file                     |
      | 2    | Write .steps.ts                         |
      | 3    | Implement code                          |
      | 4    | Run bun run bdd → all pass              |

  Scenario: Each project has its own BDD folder
    Given a project in the monorepo
    Then it should have its own "bdd/" folder with:
      | item          | purpose                          |
      | cucumber.js   | Cucumber configuration           |
      | journeys/     | Feature files organized by role  |
      | steps/        | Step definitions                 |
    Examples:
      | project            | bdd_path                  |
      | apps/portagent     | apps/portagent/bdd/       |
      | packages/agentx    | packages/agentx/bdd/      |
      | monorepo root      | bdd/                      |

  Scenario: Feature files are the source of truth
    Given a contributor wants to understand a feature
    Then they should read the .feature file, not the code
    And the feature file documents the requirement
    And the code is just implementation
