@journey @developer
Feature: Remote Mode chat.create
  A developer connects to a running AgentX server via WebSocket
  and creates a conversation using the high-level chat API.
  This should work identically to local mode.

  Scenario: chat.create and present succeed in remote mode
    Given a remote AgentX client connected to the test server
    When I create a chat "RemoteTest" via remote client
    Then the remote chat should have a valid instanceId
    And the remote chat instanceId should not equal the imageId
    When I create a presentation for the remote chat
    Then the presentation should be created successfully
