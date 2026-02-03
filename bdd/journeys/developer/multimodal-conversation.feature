@journey @developer @multimodal @pending
Feature: Multimodal Conversation Journey
  As a developer using AgentX
  I want to send images and other media
  So that I can build multimodal applications

  Scenario: Send image for analysis
    Given I create an AgentX client connected to the test server
    And I have a running agent ready
    When I subscribe to all events
    And I send multimodal message to the saved agent:
      """
      [
        { "type": "text", "text": "What colors do you see?" },
        { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" } }
      ]
      """
    Then I should receive an assistant message
