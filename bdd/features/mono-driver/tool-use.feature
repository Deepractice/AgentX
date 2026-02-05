@mono-driver @vcr @tool-use
Feature: MonoDriver Tool Use
  As a developer using MonoDriver
  I want to inject tools via DriverConfig
  So that the LLM can call tools and receive results

  Background:
    Given I have a MonoDriver with provider "anthropic" and a calculator tool

  Scenario: LLM calls calculator tool for math
    When I send message "What is 123 * 456? Use the calculator tool." to the driver
    Then I should receive a "tool_use_start" driver event
    And I should receive a "tool_use_stop" driver event
    And I should receive a "tool_result" driver event
    And I should receive "text_delta" driver events
    And the combined text delta should contain "56088"

  Scenario: Tool events appear in correct order
    When I send message "Calculate 7 + 8 using the calculator tool." to the driver
    Then the first driver event should be "message_start"
    And "tool_use_start" events should appear between "message_start" and "message_stop"
