@conversation @lifecycle
Feature: Conversation Lifecycle
  Complete conversation flow from container creation to message exchange.
  This covers the core user journey: create workspace, create conversation, send messages.

  Background:
    Given an AgentX instance

  # ============================================================================
  # Container - Workspace Isolation
  # ============================================================================

  @container
  Scenario: Create a container
    When I call agentx.request("container_create_request", { containerId: "workspace-1" })
    Then I should receive "container_create_response"
    And response.data.containerId should be "workspace-1"
    And response.data.error should be undefined

  @container
  Scenario: Get existing container
    Given container "workspace-1" exists
    When I call agentx.request("container_get_request", { containerId: "workspace-1" })
    Then I should receive "container_get_response"
    And response.data.exists should be true

  @container
  Scenario: Get non-existent container
    When I call agentx.request("container_get_request", { containerId: "non-existent" })
    Then I should receive "container_get_response"
    And response.data.exists should be false

  @container
  Scenario: List containers
    Given container "workspace-a" exists
    And container "workspace-b" exists
    When I call agentx.request("container_list_request", {})
    Then I should receive "container_list_response"
    And response.data.containerIds should contain "workspace-a"
    And response.data.containerIds should contain "workspace-b"

  # ============================================================================
  # Image - Conversation Snapshot
  # ============================================================================

  @image
  Scenario: Create an image (new conversation)
    Given container "workspace-1" exists
    When I call agentx.request("image_create_request", { containerId: "workspace-1", config: { name: "Assistant" } })
    Then I should receive "image_create_response"
    And response.data.record.imageId should be defined
    And response.data.record.name should be "Assistant"

  @image
  Scenario: Create image with system prompt
    Given container "workspace-1" exists
    When I call agentx.request("image_create_request", { containerId: "workspace-1", config: { name: "Helper", systemPrompt: "You are helpful." } })
    Then I should receive "image_create_response"
    And response.data.record should be defined

  @image
  Scenario: List images in container
    Given container "workspace-1" exists
    And image "chat-1" exists in container "workspace-1"
    And image "chat-2" exists in container "workspace-1"
    When I call agentx.request("image_list_request", { containerId: "workspace-1" })
    Then I should receive "image_list_response"
    And response.data.records should have length 2

  @image
  Scenario: Get image by ID
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    When I call agentx.request("image_get_request", { imageId: "my-chat" })
    Then I should receive "image_get_response"
    And response.data.record.imageId should be "my-chat"

  @image
  Scenario: Delete image
    Given container "workspace-1" exists
    And image "to-delete" exists in container "workspace-1"
    When I call agentx.request("image_delete_request", { imageId: "to-delete" })
    Then I should receive "image_delete_response"
    And the image should be deleted

  # ============================================================================
  # Agent - Running Instance
  # ============================================================================

  @agent
  Scenario: Run image creates agent
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    When I call agentx.request("image_run_request", { imageId: "my-chat" })
    Then I should receive "image_run_response"
    And response.data.agentId should be defined
    And response.data.reused should be false

  @agent
  Scenario: Run image reuses existing agent
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    And image "my-chat" has a running agent
    When I call agentx.request("image_run_request", { imageId: "my-chat" })
    Then I should receive "image_run_response"
    And response.data.reused should be true

  @agent
  Scenario: Stop image destroys agent
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    And image "my-chat" has a running agent
    When I call agentx.request("image_stop_request", { imageId: "my-chat" })
    Then I should receive "image_stop_response"
    And the agent should be destroyed
    And the image should still exist

  # ============================================================================
  # Message - Conversation Exchange
  # ============================================================================

  @message
  Scenario: Send message to image (auto-activates agent)
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    When I call agentx.request("message_send_request", { imageId: "my-chat", content: "Hello" })
    Then I should receive "message_send_response"
    And response.data.agentId should be defined

  @message @integration
  Scenario: Message triggers stream events
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    And I am subscribed to "text_delta" events
    And I am subscribed to "message_stop" events
    When I call agentx.request("message_send_request", { imageId: "my-chat", content: "Say hello" })
    Then I should receive "text_delta" events
    And I should receive "message_stop" event

  @message
  Scenario: Interrupt agent
    Given container "workspace-1" exists
    And image "my-chat" exists in container "workspace-1"
    And image "my-chat" has a running agent
    When I call agentx.request("agent_interrupt_request", { imageId: "my-chat" })
    Then I should receive "agent_interrupt_response"

  # ============================================================================
  # Complete Flow
  # ============================================================================

  @flow @integration
  Scenario: Complete conversation flow
    # 1. Create workspace
    When I call agentx.request("container_create_request", { containerId: "demo" })
    Then I should receive "container_create_response"

    # 2. Create conversation
    When I call agentx.request("image_create_request", { containerId: "demo", config: { name: "Demo Chat" } })
    Then I should receive "image_create_response"
    And I save response.data.record.imageId as "imageId"

    # 3. Send message (auto-activates)
    When I call agentx.request("message_send_request", { imageId: "${imageId}", content: "Hello!" })
    Then I should receive "message_send_response"

    # 4. Get messages
    When I call agentx.request("image_messages_request", { imageId: "${imageId}" })
    Then I should receive "image_messages_response"
    And response.data.messages should have at least 1 item
