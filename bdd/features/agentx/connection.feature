@agentx
Feature: AgentX Client Connection
  As a developer using AgentX
  I want to connect to the server
  So that I can interact with AI agents

  @connection
  Scenario: Connect to server
    Given I create an AgentX client connected to the test server
    Then the client should be connected

  @connection
  Scenario: Disconnect from server
    Given I create an AgentX client connected to the test server
    When I disconnect the client
    Then the client should be disconnected

  @connection
  Scenario: Dispose client
    Given I create an AgentX client connected to the test server
    When I dispose the client
