@agentx @remote
Feature: AgentX Remote Mode
  Create and use AgentX in remote mode (WebSocket client).
  Uses the global test server running on port 15300.

  Scenario: createAgentX with serverUrl connects to server
    When I call createAgentX with serverUrl "ws://localhost:15300"
    Then I should receive an AgentX instance
    And the client should be connected

  Scenario: createAgentX with static headers
    When I call createAgentX with config:
      | serverUrl | ws://localhost:15300                    |
      | headers   | { "Authorization": "Bearer token" }     |
    Then I should receive an AgentX instance

  Scenario: createAgentX with static context
    When I call createAgentX with config:
      | serverUrl | ws://localhost:15300                                            |
      | context   | { "userId": "user-123", "tenantId": "tenant-abc" }              |
    Then I should receive an AgentX instance

  Scenario: Remote client sends request and receives response
    Given a remote AgentX client connected to "ws://localhost:15300"
    When I call agentx.request("container_create_request", { containerId: "remote-test" })
    Then I should receive "container_create_response"
    And response.data.containerId should be "remote-test"

  Scenario: on subscribes to events
    Given a remote AgentX client connected to "ws://localhost:15300"
    When I call agentx.on("container_create_response", handler)
    Then I should receive an Unsubscribe function

  Scenario: Unsubscribe stops receiving events
    Given a remote AgentX client connected to "ws://localhost:15300"
    And I am subscribed to "container_create_response" events
    When I call the unsubscribe function
    Then my handler should not be called

  Scenario: dispose disconnects from server
    Given a remote AgentX client connected to "ws://localhost:15300"
    When I call agentx.dispose
    Then the client should be disconnected
