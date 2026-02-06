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

  Scenario: Monorepo BDD is Living Documentation
    Given the monorepo root "bdd/" directory
    Then its feature files serve as Living Documentation:
      | aspect   | description                                    |
      | Purpose  | Describe product requirements and project norms |
      | Audience | New contributors, AI agents, maintainers        |
      | Style    | Macro-level journeys and conventions            |
      | Testing  | Partially automated (e.g. doc quality checks)   |
    And they are "project docs written in Gherkin"

  Scenario: Package BDD is Executable Specification
    Given a package or app "bdd/" directory
    Then its feature files serve as Executable Specifications:
      | aspect   | description                                    |
      | Purpose  | Verify component behavior                      |
      | Audience | Developers working on the package               |
      | Style    | Concrete scenarios with specific assertions     |
      | Testing  | Fully automated, run on every change            |
    And they are "the real tests"

  Scenario: Living Documentation scenarios are auto-verified when possible
    Given a Living Documentation scenario
    Then if it can be programmatically verified, it should be:
      | verifiable                          | example                              |
      | File/directory existence            | BDD folder structure                 |
      | Config values                       | Changeset fixed list matches reality |
      | Naming patterns                     | Feature filenames follow convention  |
      | Dependency relationships            | Core has no internal deps            |
    And if it cannot be automated, it passes as documentation:
      | not verifiable                      | example                              |
      | Process guidance                    | "Write feature before code"          |
      | Semantic quality                    | "Scenarios describe goals"           |
      | AI behavior norms                   | "Agent reads features first"         |

  Scenario: Feature files are the source of truth
    Given a contributor wants to understand a feature
    Then they should read the .feature file, not the code
    And the feature file documents the requirement
    And the code is just implementation
