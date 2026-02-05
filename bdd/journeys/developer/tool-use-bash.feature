@journey @developer
Feature: Tool Use - Bash
  A developer creates an agent and discovers it can
  execute shell commands out of the box. No tool
  configuration needed — bash just works on Node platform.

  Scenario: Agent executes commands and works with files
    # Phase 1: Setup
    Given a local AgentX environment with provider "anthropic"
    When I create a container "my-app"
    And I create an image "ShellAgent" in "my-app" with prompt "You are a helpful assistant with bash access. When asked to run commands, use the bash tool. Be concise."
    And I run the image as an agent

    # Phase 2: Simple command
    When I send message "Use bash to run: echo hello-agentx"
    Then I should receive a non-empty reply
    And the reply should contain "hello-agentx"

    # Phase 3: File operation
    When I send message "Use bash to create a file called test.txt with the content 'Hello World', then read it back and tell me what it says."
    Then I should receive a non-empty reply
    And the reply should contain "Hello World"

    # Phase 4: Chained task
    When I send message "Use bash to list all .txt files in the current directory."
    Then I should receive a non-empty reply
    And the reply should contain "test.txt"

    # Phase 5: Environment variables
    When I send message "Use bash to set an environment variable MY_VAR=hello123 and then echo it back in the same command."
    Then I should receive a non-empty reply
    And the reply should contain "hello123"

    # Phase 6: Cleanup
    When I destroy the agent
    Then the agent should no longer exist
