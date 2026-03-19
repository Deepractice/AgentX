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

  Scenario: Monorepo uses workspace layout
    Given the monorepo root
    Then workspaces are configured as:
      | directory  | purpose                     |
      | packages/* | Publishable library packages |
      | apps/*     | Deployable applications      |

  Scenario: Core layer has no internal dependencies
    Given the package "@agentxjs/core"
    Then it should have zero dependencies on other @agentxjs packages
    And it defines the fundamental types and interfaces:
      | module      | purpose                              |
      | agent       | Agent engine (MealyMachine)           |
      | driver      | LLM Driver interface, ToolDefinition |
      | platform    | AgentXPlatform (DI container)        |
      | runtime     | AgentXRuntime (orchestration)         |
      | workspace   | Workspace, WorkspaceProvider          |
      | image       | Image management                     |
      | session     | Session/message management           |
      | event       | EventBus pub/sub                     |
      | bash        | BashProvider                         |
      | persistence | Repository interfaces                |
      | network     | JSON-RPC protocol                    |

  Scenario: Platform and driver layer depends only on core
    Given these packages:
      | package                 | depends on          |
      | @agentxjs/node-platform | @agentxjs/core      |
      | @agentxjs/claude-driver | @agentxjs/core      |
      | @agentxjs/mono-driver   | @agentxjs/core      |
    Then no package in this layer should depend on the SDK layer

  Scenario: SDK layer aggregates lower layers
    Given the package "agentxjs"
    Then it provides a unified client API
    And it depends on:
      | package                 |
      | @agentxjs/core          |
      | @agentxjs/mono-driver   |
      | @agentxjs/node-platform |

  Scenario: SDK uses RpcHandlerRegistry for RPC dispatch
    Given the agentxjs SDK
    Then RPC handlers are registered via RpcHandlerRegistry with description:
      | handler file   | methods                                          |
      | image.ts       | image.create/get/list/delete/run/stop/update/messages |
      | instance.ts    | instance.get/list/destroy/destroyAll/interrupt     |
      | message.ts     | message.send, runtime.rewind                      |
      | llm.ts         | llm.create/get/list/update/delete/default          |
      | workspace.ts   | os.read/write/list                                |
    And adding a new RPC method only requires writing a handler and registering it
    And registry is the single source of truth for method discovery
    And ax.rpcMethods() returns all registered methods with descriptions

  Scenario: Three-layer API design
    Given the agentxjs SDK public API
    Then the API has three layers:
      | layer      | access       | purpose                              |
      | chat       | ax.chat      | High-level: create/list/get agents   |
      | present    | ax.present   | UI layer: Presentation state mgmt    |
      | rpc        | ax.rpc()     | Low-level: raw RPC dispatch          |
    And AgentXClient is the unified client for both local and remote modes

  Scenario: Runtime has three first-class operations
    Given the AgentXRuntime interface
    Then it provides these core operations:
      | operation | method                          | description                    |
      | send      | receive(instanceId, content)    | Send message to agent          |
      | interrupt | interrupt(instanceId)           | Interrupt current response     |
      | rewind    | rewind(instanceId, messageId)   | Rewind + reset circuit breaker |
    And all three are system-level — all layers participate

  Scenario: Node platform provides default OS
    Given the @agentxjs/node-platform package
    Then it automatically creates a LocalOSProvider
    And OS data is stored under dataPath/os/{osId}/
    And each Image auto-generates an osId on creation
    And OS tools (read/write/edit/grep/glob/list) are auto-injected

  Scenario: All packages share base TypeScript config
    Given the file "tsconfig.base.json"
    Then all packages should extend it
    And it enforces:
      | setting          | value    |
      | target           | ES2022   |
      | module           | ESNext   |
      | moduleResolution | bundler  |
      | strict           | true     |
