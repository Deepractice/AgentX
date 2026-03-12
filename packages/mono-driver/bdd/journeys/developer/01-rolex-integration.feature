Feature: RoleX Integration in MonoDriver
  MonoDriver integrates RoleX as a built-in tool ecosystem.
  RoleX tools become MonoDriver tools, and Role Context becomes
  a dedicated context layer refreshed on every receive() call.

  Three-layer context model:
    Layer 1: System Prompt (fixed, from Image config)
    Layer 2: Role Context (dynamic, world instructions + role state, in <role-context> tags)
    Layer 3: Message Context (conversation history, managed by Driver)

  Platform separation:
    rolexPlatform is static — provided via MonoDriverOptions, captured in createDriver closure.
    roleId is dynamic — flows from ImageRecord through customData per agent.

  Background:
    Given a MonoDriver with rolexPlatform configured
    And customData contains roleId "sean"

  # ================================================================
  # RoleX Tool Registration
  # ================================================================

  Scenario: RoleX tools are available as MonoDriver tools
    When I inspect the driver's tool set
    Then the tools should include RoleX tools "activate", "want", "plan", "todo", "finish"
    And the tools should include RoleX tools "reflect", "realize", "master"
    And the tools should include RoleX tools "inspect", "survey", "use", "direct"
    And each RoleX tool should have a JSON Schema for its parameters
    And each RoleX tool should have a description from detail()

  Scenario: RoleX tools coexist with platform tools
    Given platform tools include "bash"
    When I inspect the driver's tool set
    Then both "bash" and "activate" should be available
    And there should be no name conflicts

  # ================================================================
  # Role Context Layer
  # ================================================================

  Scenario: Role auto-activates on initialize
    When I call driver.initialize()
    Then the RolexBridge should activate roleId "sean" from customData
    And the role should be ready for context projection

  Scenario: Role Context is injected as Layer 2
    When I call receive with "Hello"
    Then the LLM system prompt should contain the original systemPrompt (Layer 1)
    And the LLM system prompt should contain a <role-context> block (Layer 2)
    And the <role-context> block should contain world instructions
    And the <role-context> block should contain the role's state projection

  Scenario: Role Context refreshes on every receive
    Given the LLM has called "want" to create a goal
    When I call receive with "Show my progress"
    Then the Role Context should reflect the newly created goal

  # ================================================================
  # Tool Execution & State Mutation
  # ================================================================

  Scenario: Executing a RoleX tool returns rendered result
    When the LLM calls "want" with id "ship-v1" and goal "Feature: Ship v1"
    Then the tool result should contain the goal's state projection
    And the role's internal state should include goal "ship-v1"

  # ================================================================
  # Configuration — Platform Separation
  # ================================================================

  Scenario: RoleX requires both rolexPlatform and roleId
    Given a MonoDriverConfig with rolexPlatform but no roleId in customData
    When I create a MonoDriver with this config
    Then RoleX should NOT be initialized
    And the driver should work without RoleX tools

  Scenario: RoleX is optional - driver works without it
    Given a MonoDriverConfig without rolexPlatform
    When I create a MonoDriver with this config
    Then no RoleX tools should be registered
    And no Role Context should be injected
    And the driver should work as before

  Scenario: roleId flows through customData
    Given an ImageRecord with roleId "kant"
    When Runtime creates a DriverConfig
    Then customData should contain roleId "kant"
    And MonoDriver should use this roleId to activate the role
