@journey @developer @pending
Feature: Tool Use - Calculator
  A developer wants their agent to use a calculator tool
  for arithmetic calculations instead of guessing.

  # ============================================
  # REQUIRES: Tool injection API (defineTool + image.tools)
  # See design issue below
  # ============================================

  Scenario: Agent uses calculator tool for math
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"

    # Phase 2: Define tool and create agent
    And I define a calculator tool
    And I create an image "MathAgent" in "my-app" with prompt "You are a helpful assistant. Use the calculator tool for any math calculations." and tools
    And I run the image as an agent

    # Phase 3: Calculate
    When I send message "What is 123 * 456?"
    Then I should receive a non-empty reply
    And the reply should contain "56088"

    # Phase 4: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
