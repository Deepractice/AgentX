@journey @maintainer
Feature: Monorepo Architecture
  As a maintainer, I document the monorepo structure and package relationships,
  so contributors understand how packages fit together before making changes.

  # ============================================================================
  # Package Dependency Graph
  # ============================================================================
  #
  #  ┌─────────────────────────────────────────────────────────────┐
  #  │                    Application Layer                        │
  #  │   @agentxjs/cli (TUI)        @agentx/portagent (Web)       │
  #  └──────────┬──────────────────────────┬───────────────────────┘
  #             │                          │
  #  ┌──────────▼──────────────────────────▼───────────────────────┐
  #  │                      SDK Layer                              │
  #  │   agentxjs (unified client API)                             │
  #  └──────────┬──────────────────────────────────────────────────┘
  #             │
  #  ┌──────────▼──────────────────────────────────────────────────┐
  #  │                  Platform & Driver Layer                    │
  #  │   @agentxjs/server          @agentxjs/node-platform         │
  #  │   @agentxjs/mono-driver     @agentxjs/claude-driver         │
  #  └──────────┬──────────────────────────────────────────────────┘
  #             │
  #  ┌──────────▼──────────────────────────────────────────────────┐
  #  │                      Core Layer                             │
  #  │   @agentxjs/core (types, interfaces, base classes)          │
  #  └────────────────────────────────────────────────────────────┘
  #
  #  Supporting:
  #   @agentxjs/devtools (testing utilities, BDD tools)
  #

  Scenario: Monorepo uses workspace layout
    Given the monorepo root
    Then workspaces are configured as:
      | directory  | purpose                     |
      | packages/* | Publishable library packages |
      | apps/*     | Deployable applications      |

  Scenario: Core layer has no internal dependencies
    Given the package "@agentxjs/core"
    Then it should have zero dependencies on other @agentxjs packages
    And it defines the fundamental types: Agent, Driver, Platform, Session

  Scenario: Platform and driver layer depends only on core
    Given these packages:
      | package                 | depends on          |
      | @agentxjs/node-platform | @agentxjs/core      |
      | @agentxjs/claude-driver | @agentxjs/core      |
      | @agentxjs/mono-driver   | @agentxjs/core      |
    Then no package in this layer should depend on the SDK layer

  Scenario: Server package bridges platform and drivers
    Given the package "@agentxjs/server"
    Then it depends on:
      | package                 |
      | @agentxjs/core          |
      | @agentxjs/node-platform |
      | @agentxjs/mono-driver   |
    And it provides WebSocket server for remote agent connections

  Scenario: SDK layer aggregates lower layers
    Given the package "agentxjs"
    Then it provides a unified client API
    And it depends on:
      | package                 |
      | @agentxjs/core          |
      | @agentxjs/mono-driver   |
      | @agentxjs/node-platform |

  Scenario: Applications consume SDK and server
    Given these applications:
      | app                | type      | key dependencies                    |
      | @agentxjs/cli      | Terminal  | agentxjs, @agentxjs/server          |
      | @agentx/portagent  | Web (Next.js) | agentxjs, @agentxjs/server      |
    Then each application should use the SDK, not import core directly for runtime use

  Scenario: Build order follows dependency graph
    Given the turbo pipeline
    Then "build" task depends on "^build" (dependencies built first)
    And the effective build order is:
      | order | packages                                                  |
      | 1     | @agentxjs/core, @agentxjs/devtools                        |
      | 2     | @agentxjs/node-platform, @agentxjs/claude-driver, @agentxjs/mono-driver |
      | 3     | @agentxjs/server, agentxjs                                |
      | 4     | @agentxjs/cli, @agentx/portagent                          |

  Scenario: All packages share base TypeScript config
    Given the file "tsconfig.base.json"
    Then all packages should extend it
    And it enforces:
      | setting          | value    |
      | target           | ES2022   |
      | module           | ESNext   |
      | moduleResolution | bundler  |
      | strict           | true     |
