@agentx @local
Feature: AgentX Local Mode
  Create and use AgentX in local mode (embedded runtime).

  Scenario: createAgentX returns AgentX instance
    When I call createAgentX
    Then I should receive an AgentX instance
    And AgentX should have method "request"
    And AgentX should have method "on"
    And AgentX should have method "dispose"

  Scenario: createAgentX with custom LLM config
    When I call createAgentX with config:
      | llm.apiKey | sk-test-key              |
      | llm.model  | claude-sonnet-4-20250514 |
    Then I should receive an AgentX instance

  Scenario: createAgentX with custom agentxDir
    When I call createAgentX with agentxDir "/tmp/agentx-test"
    Then I should receive an AgentX instance

  Scenario: dispose releases all resources
    Given an AgentX instance in local mode
    When I call agentx.dispose
    Then all resources should be released
