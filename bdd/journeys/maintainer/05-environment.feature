@journey @maintainer
Feature: Environment and Commands
  As a maintainer, I document the project's commands and environment,
  so contributors can set up and run the project quickly.

  Scenario: Contributor knows the essential commands
    Given a new contributor setting up the project
    Then these commands should work:
      | command          | purpose                    |
      | bun install      | Install all dependencies   |
      | bun build        | Build all packages         |
      | bun dev          | Start dev environment      |
      | bun run bdd      | Run BDD tests              |

  Scenario: Contributor knows the required environment variables
    Given a contributor needs to run AI features
    Then they should set:
      | variable              | purpose                  | required |
      | ANTHROPIC_API_KEY     | Anthropic API access     | yes      |
      | DEEPRACTICE_API_KEY   | Deepractice API access   | alt      |
      | DEEPRACTICE_BASE_URL  | Custom API base URL      | no       |
      | DEEPRACTICE_MODEL     | Override default model   | no       |

  Scenario: Contributor uses Bun as package manager
    Given the project uses Bun
    Then all scripts should use "bun" not "npm" or "yarn"
    And the minimum version is Bun 1.3.0
    And Node.js minimum version is 22.0.0
