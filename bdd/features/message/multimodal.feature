@message @multimodal @pending
Feature: Multimodal Message API
  As a developer using AgentX
  I want to send multimodal messages
  So that I can include images and other content

  Background:
    Given I create an AgentX client connected to the test server
    And I have a running agent ready

  Scenario: Send multimodal message with text
    When I send multimodal message to the saved agent:
      """
      [
        { "type": "text", "text": "Hello, this is a multimodal message" }
      ]
      """
    Then the response should succeed

  Scenario: Send multimodal message with image
    When I send multimodal message to the saved agent:
      """
      [
        { "type": "text", "text": "What is in this image?" },
        { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } }
      ]
      """
    Then the response should succeed
