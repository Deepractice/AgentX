@bug @wip
Feature: Bug - Message stuck in "Queued" after fetching image list
  When a client fetches the image list and then sends a message,
  the message should be delivered. Currently it gets stuck in "Queued..." state.

  Bug report: After login, user fetches image list, selects an image,
  sends a message - but the response never arrives. UI shows "Queued...".

  Root cause hypothesis: Client is not subscribed to the session's topic
  after fetching image_list_response.

  Background:
    Given an AgentX server is running on port 15300
    And container "workspace" exists
    And image "chat" exists in container "workspace"

  # ============================================================================
  # Bug Reproduction
  # ============================================================================

  @critical
  Scenario: Client receives events after fetching image list
    # Step 1: New client connects (simulating fresh login)
    Given a new remote client connects to "ws://localhost:15300"

    # Step 2: Fetch image list (this should auto-subscribe to all sessions)
    When I call agentx.request("image_list_request", {})
    Then I should receive "image_list_response"
    And the response should contain __subscriptions field

    # Step 3: Subscribe to events for the image
    Given I subscribe to events for the image "chat"

    # Step 4: Send a message
    When I send a message "Hello" to image "chat"

    # Step 5: Should receive response events (NOT stuck in Queued)
    Then I should receive "text_delta" event within 10 seconds
    And I should also receive "message_stop" event

  Scenario: Verify __subscriptions field in image_list_response
    Given a new remote client connects to "ws://localhost:15300"
    When I call agentx.request("image_list_request", {})
    Then I should receive "image_list_response"
    And the response data should have "__subscriptions" array
    And "__subscriptions" should contain the session ID for image "chat"

  Scenario: Verify __subscriptions field in image_create_response
    Given a new remote client connects to "ws://localhost:15300"
    When I create a new image "test-image" in container "workspace"
    Then I should receive "image_create_response"
    And the response data should have "__subscriptions" array
    And "__subscriptions" should contain the new session ID

  # ============================================================================
  # Expected Behavior (after fix)
  # ============================================================================

  Scenario: Multiple messages work after image list fetch
    Given a new remote client connects to "ws://localhost:15300"
    When I call agentx.request("image_list_request", {})
    Then I should receive "image_list_response"

    When I send a message "First" to image "chat"
    Then I should receive response events

    When I send a message "Second" to image "chat"
    Then I should receive response events
