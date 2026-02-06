@journey @contributor
Feature: Package READMEs
  As a contributor, I need clear README for each package,
  so I can understand what it does and how to use it without reading source code.

  # ============================================================================
  # Core — 整个框架的基础，14 个 exports，目前 0 文档
  # ============================================================================

  @pending
  Scenario: Contributor understands core concepts by reading core README
    Given I am a contributor who just joined the project
    When I read packages/core/README.md
    Then I should understand what Container, Image, Session, Driver, Platform mean
    And I should know which interface to implement if I want to add a new LLM provider
    And I should know which interface to implement if I want to change storage backend
    And I should not need to open any .ts file to understand these concepts

  # ============================================================================
  # agentxjs — 主 SDK，开发者直接用的入口
  # ============================================================================

  @pending
  Scenario: Contributor can set up a working agent by reading agentxjs README
    Given I am a contributor who needs to test an agent locally
    When I read packages/agentx/README.md
    Then I should be able to copy-paste a working example that:
      | step                          | code provided |
      | Create a local agent          | yes           |
      | Send a message                | yes           |
      | Receive a streaming response  | yes           |
    And the example should work with just an API key and no server
    And I should understand when to use Local mode vs Remote mode

  # ============================================================================
  # server — WebSocket server，嵌入到 web app 里
  # ============================================================================

  @pending
  Scenario: Contributor can embed AgentX server by reading server README
    Given I am a contributor building a web app with AgentX
    When I read packages/server/README.md
    Then I should know how to:
      | task                                      | code provided |
      | Create a standalone server                | yes           |
      | Attach to an existing HTTP server         | yes           |
      | Configure WebSocket path and heartbeat    | yes           |
    And I should see the full ServerConfig type with all options and defaults

  # ============================================================================
  # mono-driver — 多 LLM 提供商驱动
  # ============================================================================

  @pending
  Scenario: Contributor can configure any LLM provider by reading mono-driver README
    Given I am a contributor who needs to switch LLM providers
    When I read packages/mono-driver/README.md
    Then I should see examples for each supported provider:
      | provider              | example provided |
      | Anthropic (default)   | yes              |
      | OpenAI                | yes              |
      | DeepSeek              | yes              |
      | Ollama (local)        | yes              |
    And I should know how to add MCP servers to the driver
    And I should understand the difference between mono-driver and claude-driver

  # ============================================================================
  # node-platform — Node.js 运行时，存储 + 事件
  # ============================================================================

  @pending
  Scenario: Contributor can set up persistence by reading node-platform README
    Given I am a contributor who needs agent data to persist
    When I read packages/node-platform/README.md
    Then I should know how to:
      | task                          | code provided |
      | Initialize with custom paths  | yes           |
      | Configure logging             | yes           |
      | Access repositories           | yes           |
    And I should see all NodePlatformOptions with defaults

  # ============================================================================
  # claude-driver — Claude 原生驱动
  # ============================================================================

  @pending
  Scenario: Contributor knows when to use claude-driver vs mono-driver
    Given I am a contributor choosing between claude-driver and mono-driver
    When I read packages/claude-driver/README.md
    Then the first paragraph should clearly state:
      | question                      | answer                                          |
      | What is this?                 | Direct Claude API driver with native features   |
      | When should I use this?       | Only if you need Claude-specific features        |
      | Should I use mono-driver instead? | Yes, for most cases mono-driver is recommended |

  # ============================================================================
  # devtools — 开发测试工具
  # ============================================================================

  @pending
  Scenario: Contributor can write BDD tests by reading devtools README
    Given I am a contributor adding a new feature with BDD tests
    When I read packages/devtools/README.md
    Then I should know how to:
      | task                              | code provided |
      | Set up cucumber config            | yes           |
      | Use agentUiTester for UI tests    | yes           |
      | Start a dev server in tests       | yes           |
      | Use MockDriver for unit tests     | yes           |
