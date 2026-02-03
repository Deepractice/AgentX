@agentx @configuration @pending
Feature: AgentX Client Configuration
  As a developer using AgentX
  I want to configure the client
  So that I can customize behavior

  Scenario: Configure with timeout
    Given I create an AgentX client with:
      | key     | value   |
      | timeout | 5000    |
    Then the client should be connected

  Scenario: Configure with debug mode
    Given I create an AgentX client with:
      | key   | value |
      | debug | true  |
    Then the client should be connected
