@journey @contributor
Feature: AgentX Connection
  As a contributor, I integrate AgentX WebSocket server into Portagent,
  so users can chat with AI agents via the standard agentxjs SDK.

  # ============================================================================
  # Architecture: Option C - Embedded WebSocket Server
  # ============================================================================
  #
  #   Browser                    Portagent (Next.js + WS)
  #  ┌────────────┐             ┌─────────────────────┐
  #  │  agentxjs  │ ─ WS ─────→ │  WebSocket :3000/ws │
  #  │  (SDK)     │ ← JSON-RPC  │    ↓                │
  #  └────────────┘             │  @agentxjs/server   │
  #                             │    ↓                │
  #                             │  Claude API         │
  #                             └─────────────────────┘
  #

  # ============================================================================
  # WebSocket Server Setup
  # ============================================================================

  Scenario: WebSocket server is embedded in Next.js
    Given the portagent project
    Then package.json should have "@agentxjs/server" dependency
    And package.json should have "@agentxjs/node-platform" dependency
    And package.json should have "@agentxjs/mono-driver" dependency

  Scenario: WebSocket endpoint is available
    Given the portagent dev server is running
    When I connect to WebSocket at "/ws"
    Then the connection should be established
    And I should receive a welcome message or be able to send RPC

  # ============================================================================
  # Client Connection
  # ============================================================================

  Scenario: Browser can connect with agentxjs SDK
    Given the portagent dev server is running
    When I create an AgentX client with serverUrl "ws://localhost:3000/ws"
    Then the client should connect successfully

  Scenario: Client authenticates with user session
    Given I am logged in
    When I create an AgentX client
    Then the client should include auth headers from session
    And the server should recognize my user

  # ============================================================================
  # Agent Lifecycle
  # ============================================================================

  Scenario: Create container and image for user
    Given I am logged in
    And I have an AgentX client
    When I create a container for my user
    And I create an image with system prompt "You are helpful"
    Then the image should be created
    And I should be subscribed to the session

  Scenario: Send message and receive stream
    Given I have an active agent
    When I send message "Hello"
    Then I should receive text_delta events
    And I should receive message_stop event
    And the response should contain text

  # ============================================================================
  # Integration with Chat UI
  # ============================================================================

  Scenario: Chat UI uses agentxjs for messaging
    Given I am on the chat page
    When I type "Hello" and send
    Then agentxjs should send message via WebSocket
    And stream events should update the UI
    And the assistant response should appear

  # ============================================================================
  # Data Model
  # ============================================================================
  #
  # Each user has:
  # - One container (containerId = `user-{userId}`)
  # - Multiple images (conversations)
  # - Sessions are auto-created per image
  #
  # Mapping:
  # - Portagent "session" UI = AgentX "image"
  # - New chat = create new image
  # - Switch session = switch image
  #

  # ============================================================================
  # API Design
  # ============================================================================
  #
  # WebSocket endpoint: /ws
  # Protocol: JSON-RPC 2.0 (standard AgentX protocol)
  #
  # HTTP endpoints (for session management):
  # GET  /api/chat/sessions          → list user's images
  # POST /api/chat/sessions          → create new image
  # GET  /api/chat/sessions/:id      → get image details + messages
  # DELETE /api/chat/sessions/:id    → delete image
  #
  # WebSocket is used for:
  # - message.send (real-time streaming)
  # - Stream events (text_delta, etc.)
  #
