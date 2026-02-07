@journey @organization
Feature: Organization Mission
  As a Deepractice member, I need to understand what we do and why,
  so every product and code decision serves the same mission.

  # ============================================================================
  # Who We Are
  # ============================================================================

  Scenario: Member understands the organization identity
    Given I am a new member of Deepractice
    Then I should know:
      | question              | answer                                          |
      | What is Deepractice?  | AI 智能体的基础设施公司                           |
      | What do we build?     | 智能体运行和流通的底层能力                        |
      | What is our role?     | 修路的——不管哪个智能体火了，都要用我们的服务        |

  # ============================================================================
  # The Problem We Solve
  # ============================================================================

  Scenario: Member understands the core problem
    Given the AI agent era is here
    Then the problem is not building agents — that part is easy
    And the real problem is: 智能体造出来容易，用起来难
    And what is missing is circulation — agents cannot flow from creators to users
    And Deepractice exists to solve this circulation problem

  # ============================================================================
  # AgentVM: 6 Protocols + 6 Products
  # ============================================================================
  #
  #  ┌─────────────────────────────────────────────────────────┐
  #  │                    AgentVM 技术栈                        │
  #  │                                                         │
  #  │  PromptX    — 大脑 — DPML  — 怎么写智能体               │
  #  │  AgentX     — 身体 — DARP  — 怎么找资源、怎么运行        │
  #  │  ToolX      — 双手 — DATP  — 怎么用工具                 │
  #  │  UIX        — 表达 — UIX   — 怎么展示结果               │
  #  │  ResourceX  — 市场 — DAEP  — 怎么协作、分享             │
  #  │  SandboX    — 工作间— DASP — 怎么安全运行               │
  #  │                                                         │
  #  │  目标：一次开发，到处运行                                 │
  #  └─────────────────────────────────────────────────────────┘
  #

  Scenario: Member understands the AgentVM technology stack
    Given Deepractice builds the AgentVM technology stack
    Then AgentVM consists of 6 protocols and 6 products:
      | product    | metaphor | protocol | responsibility                 |
      | PromptX    | 大脑     | DPML     | How to define an agent         |
      | AgentX     | 身体     | DARP     | How to run an agent            |
      | ToolX      | 双手     | DATP     | How to use tools               |
      | UIX        | 表达     | UIX      | How to render results          |
      | ResourceX  | 市场     | DAEP     | How to share and collaborate   |
      | SandboX    | 工作间   | DASP     | How to run securely            |
    And together they enable: 一次开发，到处运行

  # ============================================================================
  # The Flywheel
  # ============================================================================

  Scenario: Member understands the flywheel business model
    Given Deepractice has three pillars
    Then they form a flywheel:
      | pillar         | purpose                        | revenue    |
      | Open source    | Attract developers, build trust | No         |
      | Cloud platform | Run and trade agents            | Yes (main) |
      | Education      | Grow the developer ecosystem    | No         |
    And the cycle is: open source → education → cloud platform → reinvest in open source
    And open source is the entry point, cloud platform is where we monetize

  # ============================================================================
  # Where AgentX Fits
  # ============================================================================

  Scenario: Member understands AgentX's role in the bigger picture
    Given the AgentVM technology stack
    Then AgentX is the "身体" — the runtime engine for agents
    And it is one of the 6 products, not the whole story
    And its job is to make agents run — create, manage, execute, stream
    And it must stay lightweight and pluggable because:
      | reason                                                        |
      | Agents must flow across environments (the circulation mission)|
      | The integration layer is thin (the world cognition)           |
      | Open source must be easy to adopt (the flywheel entry point)  |

  Scenario: Member understands why every code decision matters
    Given AgentX serves the circulation mission
    Then when writing code, a member should ask:
      | question                                     | wrong answer                  |
      | Does this bind us to a specific LLM?         | Yes → violates pluggability   |
      | Does this bind us to a specific runtime?     | Yes → violates portability    |
      | Does this add unnecessary weight?            | Yes → violates thinness       |
      | Does this make it harder to swap components?  | Yes → violates circulation    |
    And the architecture principles from the world cognition are not abstract
    And they are concrete coding guidelines that every contributor must follow
