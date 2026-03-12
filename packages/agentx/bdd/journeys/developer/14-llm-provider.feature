@journey @developer
Feature: LLM Provider Management
  A developer wants to manage LLM provider configurations through
  the ax.llm namespace, so agent creation can pull provider settings
  from the platform instead of hardcoding them in createDriver closures.

  Background:
    Given a local AgentX environment

  Scenario: Create an LLM provider
    When I create an LLM provider:
      | field    | value                        |
      | name     | My Anthropic                 |
      | vendor   | anthropic                    |
      | protocol | anthropic                    |
      | apiKey   | sk-ant-test-key              |
      | model    | claude-sonnet-4-20250514     |
    Then the LLM provider should be created with name "My Anthropic"
    And the LLM provider vendor should be "anthropic"
    And the LLM provider protocol should be "anthropic"

  Scenario: Create an OpenAI-compatible provider
    When I create an LLM provider:
      | field    | value                             |
      | name     | Deepseek                          |
      | vendor   | deepseek                          |
      | protocol | openai                            |
      | apiKey   | sk-deepseek-test-key              |
      | baseUrl  | https://api.deepseek.com/v1       |
      | model    | deepseek-chat                     |
    Then the LLM provider should be created with name "Deepseek"
    And the LLM provider vendor should be "deepseek"
    And the LLM provider protocol should be "openai"

  Scenario: List LLM providers
    Given I have created LLM providers:
      | name          | vendor    | protocol  |
      | Anthropic     | anthropic | anthropic |
      | OpenAI        | openai    | openai    |
      | Local Ollama  | ollama    | openai    |
    When I list LLM providers
    Then the list should contain 3 providers
    And the list should include "Anthropic" with vendor "anthropic"
    And the list should include "Local Ollama" with vendor "ollama"

  Scenario: Get an LLM provider by ID
    When I create an LLM provider:
      | field    | value            |
      | name     | My Claude        |
      | vendor   | anthropic        |
      | protocol | anthropic        |
      | apiKey   | sk-test          |
    And I get the LLM provider by its ID
    Then the LLM provider name should be "My Claude"

  Scenario: Update an LLM provider
    When I create an LLM provider:
      | field    | value            |
      | name     | Old Name         |
      | vendor   | anthropic        |
      | protocol | anthropic        |
      | apiKey   | sk-old           |
      | model    | claude-haiku     |
    And I update the LLM provider model to "claude-sonnet"
    Then the LLM provider model should be "claude-sonnet"
    And the LLM provider name should be "Old Name"

  Scenario: Delete an LLM provider
    When I create an LLM provider:
      | field    | value            |
      | name     | To Delete        |
      | vendor   | openai           |
      | protocol | openai           |
      | apiKey   | sk-delete        |
    And I delete the LLM provider
    Then the LLM provider should no longer exist

  Scenario: Set default LLM provider
    Given I have created LLM providers:
      | name       | vendor    | protocol  |
      | Provider A | anthropic | anthropic |
      | Provider B | openai    | openai    |
    When I set "Provider B" as the default LLM provider
    Then the default LLM provider should be "Provider B"

  Scenario: Change default LLM provider
    Given I have created LLM providers:
      | name       | vendor    | protocol  |
      | Provider A | anthropic | anthropic |
      | Provider B | openai    | openai    |
    And "Provider A" is the default LLM provider
    When I set "Provider B" as the default LLM provider
    Then the default LLM provider should be "Provider B"

  Scenario: LLM provider persists after reload
    When I create an LLM provider:
      | field    | value             |
      | name     | Persistent        |
      | vendor   | anthropic         |
      | protocol | anthropic         |
      | apiKey   | sk-persist        |
      | baseUrl  | https://custom.ai |
      | model    | claude-sonnet     |
    And I reload the LLM provider by its ID
    Then the LLM provider name should be "Persistent"
    And the LLM provider baseUrl should be "https://custom.ai"
