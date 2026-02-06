@journey @maintainer
Feature: Adding a New Package
  As a maintainer, I document the checklist for adding a new package,
  so contributors can extend the monorepo without breaking conventions.

  Scenario: New package follows the directory structure
    Given a contributor wants to add a new package
    Then they should create it under "packages/" with this structure:
      | path                | purpose                         |
      | package.json        | Name, version, exports, scripts |
      | tsconfig.json       | Extends tsconfig.base.json      |
      | src/index.ts        | Public API entry point           |
      | README.md           | Documentation for the package    |

  Scenario: package.json follows monorepo conventions
    Given a new package named "@agentxjs/example"
    Then its package.json should include:
      | field              | value or pattern                          |
      | name               | @agentxjs/example                         |
      | version            | Match current fixed version               |
      | type               | module                                    |
      | main               | dist/index.js                             |
      | types              | dist/index.d.ts                           |
      | exports            | ./dist/index.js with types                |
      | scripts.build      | A build command (tsc or tsup)             |
    And internal dependencies use "workspace:*" protocol

  Scenario: New package is registered in the build pipeline
    Given a new package is added
    Then Turbo should automatically detect it via the workspace config
    And "bun build" from root should include the new package
    And the package should appear in changesets fixed group if publishable

  Scenario: New package gets a README following the template
    Given a new package needs documentation
    Then the README should include:
      | section         | content                              |
      | Title           | Package name and one-line description |
      | Quick Start     | Install + minimal usage example       |
      | API Reference   | Key exports and their purpose         |
      | Architecture    | How it fits in the dependency graph   |

  Scenario: New app follows the app conventions
    Given a contributor wants to add a new application
    Then they should create it under "apps/" with:
      | requirement            | detail                             |
      | package.json private   | "private": true                    |
      | BDD directory          | bdd/ with cucumber.js and journeys |
      | Dev command             | "bun dev" starts the application   |
    And the app should import from SDK layer, not core directly
