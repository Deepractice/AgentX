@journey @developer
Feature: Log Level Configuration
  A developer embedding AgentX in tests, CLI tools, or production apps
  needs to control log verbosity through a single option.
  Today this requires manually importing commonxjs/logger and node-platform —
  it should be one line in AgentXConfig.

  Scenario: Silence all logs with logLevel option
    # Current pain: developer must import createNodePlatform + setLoggerFactory
    # Expected: just pass logLevel to createAgentX
    When I create AgentX with logLevel "silent"
    And I create an image "Assistant" with prompt "Say hello"
    And I run the image as an agent
    Then console output should contain no AgentX logs

  Scenario: Debug logs for troubleshooting
    When I create AgentX with logLevel "debug"
    And I create an image "Assistant" with prompt "Say hello"
    And I run the image as an agent
    Then console output should contain "DEBUG"
