@agentx @remote
Feature: AgentX Remote Mode
  Create and use AgentX in remote mode (WebSocket client).
  Remote mode connects to an AgentX server, suitable for browsers and distributed systems.

  Background:
    Given an AgentX server is running on port 15300

  # ============================================================================
  # createAgentX({ serverUrl }) - Remote Connection
  # ============================================================================

  Scenario: createAgentX({ serverUrl }) connects to server
    When I call createAgentX with serverUrl "ws://localhost:15210"
    Then I should receive an AgentX instance
    And the client should be connected

  Scenario: createAgentX with static headers
    When I call createAgentX with config:
      | serverUrl | ws://localhost:15210          |
      | headers   | { "Authorization": "Bearer token" } |
    Then I should receive an AgentX instance

  Scenario: createAgentX with static context
    When I call createAgentX with config:
      | serverUrl | ws://localhost:15210 |
      | context   | { "userId": "user-123", "tenantId": "tenant-abc" } |
    Then I should receive an AgentX instance

  # ============================================================================
  # request() - Request/Response Communication
  # ============================================================================

  Scenario: Remote client sends request and receives response
    Given a remote AgentX client connected to "ws://localhost:15210"
    When I call agentx.request("container_create_request", { containerId: "remote-test" })
    Then I should receive "container_create_response"
    And response.data.containerId should be "remote-test"

  Scenario: Request timeout throws error
    Given a remote AgentX client connected to "ws://localhost:15210"
    When I call agentx.request("container_get_request", { containerId: "slow" }, 100)
    Then it should throw timeout error

  # ============================================================================
  # on() / onCommand() - Event Subscription
  # ============================================================================

  Scenario: on(type, handler) subscribes to events
    Given a remote AgentX client connected to "ws://localhost:15210"
    When I call agentx.on("container_create_response", handler)
    Then I should receive an Unsubscribe function

  Scenario: Unsubscribe stops receiving events
    Given a remote AgentX client connected to "ws://localhost:15210"
    And I am subscribed to "container_create_response" events
    When I call the unsubscribe function
    And a container_create_response event is emitted
    Then my handler should not be called

  # ============================================================================
  # dispose() - Cleanup
  # ============================================================================

  Scenario: dispose() disconnects from server
    Given a remote AgentX client connected to "ws://localhost:15210"
    When I call agentx.dispose
    Then the client should be disconnected

  # ============================================================================
  # Reconnection
  # ============================================================================

  @reconnect
  Scenario: Client automatically reconnects after disconnect
    Given a remote AgentX client connected to "ws://localhost:15210"
    When the server connection is dropped
    Then the client should reconnect automatically
    And the client should be connected
