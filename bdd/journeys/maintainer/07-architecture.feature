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
    And it defines the fundamental types: Container, Image, Session, Driver, AgentXPlatform

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

  Scenario: Core layer has no platform-specific imports
    Given the package "@agentxjs/core"
    Then its source files should not import platform-specific modules:
      | module | reason                                       |
      | ws     | WebSocket impl belongs in platform layer     |

  Scenario: Driver declares supported LLM protocols
    Given the Driver interface in @agentxjs/core
    Then each Driver implementation must declare supportedProtocols:
      | driver           | supportedProtocols          |
      | MonoDriver       | ["anthropic", "openai"]     |
      | ClaudeDriver     | ["anthropic"]               |
      | MockDriver       | ["anthropic", "openai"]     |
    And LLMProtocol is defined as "anthropic" | "openai"

  Scenario: LLM Provider management via ax.llm namespace
    Given the agentxjs SDK
    Then it provides an ax.llm namespace for managing LLM provider configurations:
      | operation  | description                                |
      | create     | Register a new LLM provider                |
      | get        | Retrieve provider by ID                    |
      | list       | List providers                             |
      | update     | Update provider settings                   |
      | delete     | Remove a provider                          |
      | setDefault | Set the default provider                   |
      | getDefault | Get the default provider                   |
    And each provider has vendor (who provides) and protocol (API format) fields
    And vendor and protocol are separate dimensions (e.g. deepseek vendor uses openai protocol)

  Scenario: createAgent validates LLM provider protocol
    Given an LLM provider is configured with a protocol
    And a Driver declares its supportedProtocols
    When createAgent is called
    Then the runtime checks that the provider's protocol is in driver.supportedProtocols
    And throws "Protocol mismatch" error if they don't match

  Scenario: Context integration — three-layer system prompt
    Given the Context interface in @agentxjs/core/context
    Then it provides three things:
      | property       | description                                       |
      | schema         | Cognitive framework (fixed per context)            |
      | project()      | Dynamic state projection (refreshed each turn)    |
      | capabilities()   | Capability[] — what the context can do (tools, etc.) |
    And the system prompt is structured as:
      | layer | tag             | source                    |
      | 1     | <system>        | Image.systemPrompt        |
      | 2     | <instructions>  | Context.schema            |
      | 2     | <context>       | Context.project()         |
      | 3     | (messages)      | Session history           |

  Scenario: ContextProvider is a platform-level factory
    Given the ContextProvider interface in @agentxjs/core/context
    Then it has a single method: create(contextId) → Context
    And it is registered on AgentXPlatform.contextProvider
    And Runtime calls it when ImageRecord has a contextId

  Scenario: Node platform accepts external context provider
    Given the @agentxjs/node-platform package
    Then contextProvider is an optional parameter — not built-in
    And if not provided, agents run without cognitive context
    And default data path is:
      | component | path                    |
      | AgentX    | ~/.deepractice/agentx   |

  Scenario: All packages share base TypeScript config
    Given the file "tsconfig.base.json"
    Then all packages should extend it
    And it enforces:
      | setting          | value    |
      | target           | ES2022   |
      | module           | ESNext   |
      | moduleResolution | bundler  |
      | strict           | true     |
