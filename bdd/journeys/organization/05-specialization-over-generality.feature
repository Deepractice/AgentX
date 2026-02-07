@journey @organization
Feature: Specialization Over Generality
  As a Deepractice member, I need to understand why we build specialized resources
  on top of general capabilities, so I don't fall into the trap of "general-purpose
  infrastructure is enough".

  # ============================================================================
  # The Industry Debate
  # ============================================================================
  #
  #  Route A (ByteDance/Coze): Code is everything
  #    → AI writes code to create any tool on the fly
  #
  #  Route B (Anthropic/Vercel): Bash is everything
  #    → AI uses the OS to accomplish any task
  #
  #  Route C (Deepractice): Specialized resources > General capabilities
  #    → Professional scenarios need curated, verified, out-of-the-box tools
  #
  #  The assumption behind A and B: AI is so powerful that low-level
  #  infrastructure is enough — AI will figure out the rest.
  #
  #  The reality: Even AI prefers ready-made tools over reinventing from scratch.
  #

  Scenario: Member understands the three industry routes
    Given the AI agent industry is debating how agents should use tools
    Then there are three main positions:
      | route         | belief                                   | advocate          |
      | Code-first    | AI writes code to build any tool on-the-fly | ByteDance/Coze |
      | Bash-first    | AI uses OS/shell to accomplish anything   | Anthropic/Vercel  |
      | Resource-first| AI uses specialized, verified resources   | Deepractice       |
    And code-first and bash-first assume general capability is sufficient
    And Deepractice disagrees — general capability is the floor, not the ceiling

  # ============================================================================
  # Efficiency vs Generality: The Fundamental Trade-off
  # ============================================================================

  Scenario: Member understands efficiency and generality are in tension
    Given a spectrum from general to specialized
    Then efficiency and generality are inversely correlated:
      | approach                  | generality | efficiency | predictability |
      | Bash: run any command     | Very high  | Very low   | Low            |
      | Code: write any program   | High       | Low        | Medium         |
      | Tool: call a defined API  | Medium     | Medium     | Medium         |
      | Skill: run verified flow  | Low        | Very high  | Very high      |
    And in professional B2B scenarios, clients need:
      | requirement       | general approach delivers? | specialized approach delivers? |
      | Stable results    | No — different every time  | Yes — verified and tested      |
      | Fast execution    | No — creates from scratch  | Yes — ready to run             |
      | Predictable cost  | No — token waste on creation| Yes — optimized token usage   |

  # ============================================================================
  # AI Also Needs Abstraction Layers
  # ============================================================================

  Scenario: Member understands that AI needs encapsulation just like humans do
    Given that AI is powerful enough to write anything from scratch
    But power does not eliminate the need for abstraction
    Then the same principle applies to AI as to human developers:
      | human developer reality                  | AI agent reality                       |
      | Can write in assembly — but uses npm     | Can write code — but prefers skills    |
      | Can build HTTP from scratch — uses axios  | Can bash anything — prefers tools      |
      | Values libraries that are tested          | Values resources that are verified     |
      | Productivity comes from good abstractions | Efficiency comes from good resources   |
    And the assumption "AI is smart enough to not need encapsulation" is wrong
    And in reality: the smarter the developer, the more they depend on good abstractions

  Scenario: Member understands why layered encapsulation still matters
    Given some believe low-level infrastructure is enough for AI
    Then reality shows that professional domains still need layers:
      | layer              | what it provides                     | example              |
      | General capability | Floor — AI can attempt anything      | Bash, code execution |
      | Defined tools      | Structured — consistent interfaces   | MCP tools, APIs      |
      | Verified skills    | Reliable — tested, optimized flows   | Deploy skill, review skill |
      | Domain solutions   | Turnkey — out-of-the-box for a vertical | Finance reporting, legal analysis |
    And each layer up trades generality for efficiency
    And each layer up is more valuable to B2B customers
    And Deepractice builds the upper layers, not just the floor

  # ============================================================================
  # Strategic Positioning
  # ============================================================================

  Scenario: Member understands Deepractice's positioning in this debate
    Given efficiency and generality are in tension
    Then Deepractice's strategic choice is:
      | we do                                          | we leave to others                     |
      | Specialized B2B professional systems           | General-purpose consumer AI            |
      | Curated, verified skills and tools             | Write-code-from-scratch approaches     |
      | Cloud platform with ready-to-use resources     | Low-level infrastructure only          |
      | Domain-specific efficiency                     | Do-anything generality                 |
    And model companies naturally gravitate toward generality — that is their strength
    And we naturally gravitate toward specialization — that is our moat
    And these positions are complementary, not competitive:
      | model companies provide  | Deepractice provides                          |
      | The floor (general AI)   | The ceiling (specialized, efficient resources) |

  Scenario: Member connects this to the asset strategy
    Given specialized resources are more valuable than general capabilities
    Then the resources from 04-agent-era-assets become the strategic differentiator:
      | general resource         | specialized resource (higher value)     |
      | "AI can write code"      | "Verified deploy skill for Next.js"    |
      | "AI can use bash"        | "Tested database migration workflow"   |
      | "AI can call any API"    | "Curated financial data tool with validation" |
    And every specialized resource we accumulate widens the gap
    And this is why ResourceX matters — it is the accumulation engine for specialized assets
    And the more specialized resources on our platform, the harder it is to replicate
