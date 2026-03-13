@journey @developer
Feature: Context Integration
  A developer wants to create an agent with cognitive context.
  When an Image has a contextId, the platform's ContextProvider
  automatically injects instructions, tools, and dynamic state
  into the Driver via the three-layer context model.

  Background:
    Given a local AgentX environment with provider "anthropic"
    And the platform has a RoleX context provider

  # ================================================================
  # Context Auto-Injection
  # ================================================================

  Scenario: Agent with contextId gets RoleX tools and context
    When I create an image "Nuwa" with prompt "You are Nuwa." and contextId "nuwa"
    And I run the image as an agent
    Then the agent should have RoleX tools available
    And the system prompt should contain "<instructions>" block
    And the system prompt should contain "<context>" block

  Scenario: Agent without contextId works normally
    When I create an image "Bot" with prompt "You are a bot."
    And I run the image as an agent
    Then the agent should NOT have RoleX tools
    And the system prompt should only contain "<system>" block

  # ================================================================
  # Three-Layer System Prompt
  # ================================================================

  Scenario: System prompt is structured in XML layers
    When I create an image "Agent" with prompt "Be helpful." and contextId "nuwa"
    And I run the image as an agent
    Then the system prompt Layer 1 should be wrapped in "<system>"
    And the system prompt Layer 2 instructions should be wrapped in "<instructions>"
    And the system prompt Layer 2 projection should be wrapped in "<context>"

  # ================================================================
  # Context Refreshes Per Turn
  # ================================================================

  Scenario: Context projection refreshes on every receive
    Given I create an image "Learner" with prompt "You learn." and contextId "sean"
    And I run the image as an agent
    When I send message "I want to ship v1"
    Then the RoleX role should have processed the message
    When I send message "What are my goals?"
    Then the context projection should reflect the latest role state

  # ================================================================
  # Default Paths
  # ================================================================

  Scenario: Node platform uses default Deepractice paths
    When I create a node platform with default options
    Then AgentX data should be stored at "~/.deepractice/agentx"
    And RoleX data should be stored at "~/.deepractice/rolex"

  Scenario: Data paths are configurable
    When I create a node platform with dataPath "/tmp/ax" and rolexDataPath "/tmp/rx"
    Then AgentX data should be stored at "/tmp/ax"
    And RoleX data should be stored at "/tmp/rx"
