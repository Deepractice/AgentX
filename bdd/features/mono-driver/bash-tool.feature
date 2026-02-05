@mono-driver @vcr @bash-tool
Feature: MonoDriver Bash Tool
  As a developer using MonoDriver
  I want the LLM to execute shell commands via the bash tool
  So that agents can interact with the system

  Background:
    Given I have a MonoDriver with provider "anthropic" and a bash tool

  Scenario: LLM uses bash to run a command
    When I send message "Use the bash tool to run: echo hello-agentx" to the driver
    Then I should receive a "tool_use_start" driver event
    And I should receive a "tool_result" driver event
    And the combined text delta should contain "hello-agentx"
