Feature: RoleX Context in AgentX
  AgentX integrates RoleX through a generic Context abstraction.
  RolexContext implements Context, providing instructions, tools,
  and dynamic state projection for any Driver.

  Three-layer context model:
    Layer 1: System Prompt (fixed, from Image config) — <system>
    Layer 2: Context (dynamic, instructions + role state) — <instructions> + <context>
    Layer 3: Message Context (conversation history, managed by Session)

  Architecture:
    ContextProvider is on AgentXPlatform — a generic factory.
    Node platform creates RolexContextProvider by default.
    contextId on ImageRecord tells Runtime which context to create.
    Context is created once per agent, projection refreshes each turn.

  Background:
    Given a node platform with default RoleX context provider
    And an ImageRecord with contextId "nuwa"

  # ================================================================
  # RoleX Tool Registration
  # ================================================================

  Scenario: RoleX tools are provided via Context.getTools()
    When Runtime creates an agent from the ImageRecord
    Then the driver should have RoleX tools "activate", "want", "plan", "todo", "finish"
    And the driver should have RoleX tools "reflect", "realize", "master"
    And the driver should have RoleX tools "inspect", "survey", "use", "direct"
    And each tool should have a JSON Schema for its parameters

  Scenario: RoleX tools coexist with platform tools
    Given the platform provides a "bash" tool
    When Runtime creates an agent from the ImageRecord
    Then both "bash" and "activate" should be in the tool set
    And there should be no name conflicts

  # ================================================================
  # Context Layer
  # ================================================================

  Scenario: Context instructions are injected as Layer 2
    When I call receive with "Hello"
    Then the system prompt should contain an <instructions> block with world instructions
    And the system prompt should contain a <context> block with role state

  Scenario: Context projection refreshes on every receive
    Given the LLM has called "want" to create a goal
    When I call receive with "Show my progress"
    Then the <context> block should reflect the newly created goal

  # ================================================================
  # Tool Execution
  # ================================================================

  Scenario: RoleX tool calls are dispatched dynamically via RPC schema
    When the LLM calls "want" with content "Feature: Ship v1"
    Then the tool call should be dispatched via toArgs("role.want", args)
    And the result should contain the goal's state projection

  Scenario: Builder-level tools bypass role dispatch
    When the LLM calls "inspect" with id "some-node"
    Then the call should go directly to RoleXBuilder.inspect()
    And not to the role instance

  # ================================================================
  # Configuration
  # ================================================================

  Scenario: Context is optional — no contextId means no RoleX
    Given an ImageRecord without contextId
    When Runtime creates an agent from the ImageRecord
    Then no RoleX tools should be registered
    And no context layers should be injected
    And the driver should work normally

  Scenario: Context provider can be disabled
    Given a node platform with contextProvider set to null
    And an ImageRecord with contextId "nuwa"
    When Runtime creates an agent from the ImageRecord
    Then no context should be created
    And the agent should work without RoleX
