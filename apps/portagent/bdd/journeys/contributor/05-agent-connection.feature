@journey @contributor
Feature: AgentX Connection
  As a contributor, I integrate AgentX WebSocket server into Portagent,
  so users can chat with AI agents via the standard agentxjs SDK.

  # ============================================================================
  # Architecture: Embedded WebSocket Server
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
  # Dependencies
  # ============================================================================

  Scenario: AgentX packages are integrated
    Given the portagent project
    Then package.json should have "@agentxjs/server" dependency
    And package.json should have "@agentxjs/node-platform" dependency
    And package.json should have "@agentxjs/mono-driver" dependency

  # ============================================================================
  # End-to-End: User chats with AI agent
  # ============================================================================

  @ui @pending
  Scenario: User sends message and receives AI response
    Given I am logged in as admin "admin@example.com"
    When I type "Hello" in the prompt
    And I press Enter
    Then my message should appear in conversation
    And I should see an AI response in conversation

  @ui @pending
  Scenario: AI response streams into the UI
    Given I am logged in as admin "admin@example.com"
    When I type "Say hi" in the prompt
    And I press Enter
    Then I should see the response appearing progressively

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
