@journey @organization
Feature: Protocol as Interface Layer
  As a Deepractice member, I need to understand why we define our own protocols
  as a glue layer above industry standards, so I build systems that embody our
  worldview without reinventing lower-level implementations.

  # ============================================================================
  # Own the Interface, Delegate the Implementation
  # ============================================================================
  #
  #  ┌──────────────────────────────────────────────┐
  #  │  Deepractice Protocols                       │
  #  │  DPML / DARP / DATP / DAEP / DASP / UIX     │
  #  │  Glue layer — embodies OUR worldview         │
  #  │  Defines HOW agents should work              │
  #  ├──────────────────────────────────────────────┤
  #  │  Industry Protocols                          │
  #  │  MCP / A2A / ACP / ANP / ...                 │
  #  │  Implementation layer — encapsulate others'  │
  #  │  Provides the HOW underneath                 │
  #  └──────────────────────────────────────────────┘
  #
  #  Not competition. Layered composition.
  #

  Scenario: Member understands why we need our own protocols
    Given Deepractice has its own worldview, technical route, and values
    Then we need our own protocol layer because:
      | reason                                                              |
      | Without our own protocols, we follow others' worldview              |
      | Others' protocols serve others' goals — not ours                    |
      | Our mission (portable, thin, specialized agents) needs its own interface |
      | Owning the interface gives us architectural sovereignty             |
    And this is not about reinventing wheels
    And it is about defining the interface that expresses our vision

  Scenario: Member understands the glue layer concept
    Given our protocols are an interface layer
    Then they function as glue between our vision and industry implementations:
      | our protocol | our intent                    | can wrap underneath      |
      | DPML         | How to define an agent        | Any prompt format        |
      | DARP         | How to discover resources     | Any registry protocol    |
      | DATP         | How to use tools              | MCP, native APIs         |
      | DAEP         | How agents collaborate        | A2A, custom messaging    |
      | DASP         | How to run securely           | Any sandbox technology   |
      | UIX          | How to render results         | Any UI framework         |
    And the protocol defines WHAT should happen (our worldview)
    And the implementation defines HOW it happens (can be anyone's)

  Scenario: Member understands the relationship with industry standards
    Given MCP is becoming the de facto tool integration standard
    And A2A is emerging for agent-to-agent communication
    Then our relationship with these standards is:
      | stance         | meaning                                                |
      | Not competing  | We do not replace MCP or A2A at their level            |
      | Not dependent  | We are not locked into any single industry protocol     |
      | Encapsulating  | We wrap them as implementation details under our interface |
      | Complementary  | They solve low-level plumbing, we solve high-level intent |
    And today DATP may wrap MCP for tool integration
    And tomorrow if a better standard emerges, we swap the implementation
    And our protocol layer — and the agents built on it — remain unchanged

  # ============================================================================
  # The Pattern: Same as Core Architecture
  # ============================================================================

  Scenario: Member sees the consistent pattern across all layers
    Given the protocol-as-interface principle
    Then the same pattern repeats throughout Deepractice's architecture:
      | layer              | our interface              | swappable implementation    |
      | LLM access         | Driver interface           | Anthropic, OpenAI, Ollama   |
      | Runtime            | Platform interface         | Node.js, future runtimes    |
      | Tool integration   | DATP protocol              | MCP, native APIs            |
      | Agent collaboration| DAEP protocol              | A2A, custom protocols       |
      | Agent definition   | DPML protocol              | Any prompt format           |
    And this is not coincidence — it is the architectural expression of our core principles:
      | principle from 00  | how it manifests here                    |
      | Pluggable          | Implementation is always swappable       |
      | Portable           | Interface stays the same across environments |
      | Low coupling       | Interface and implementation are separated |
      | Lightweight        | Glue layer is thin, not a heavy framework |

  Scenario: Member applies this when choosing technologies
    Given the own-the-interface principle
    Then when making technology decisions, a member should:
      | do                                              | don't                                        |
      | Define our interface first, then pick implementation | Adopt an external protocol as our primary API |
      | Wrap external tools behind our protocol layer    | Expose MCP/A2A directly to agent developers   |
      | Keep the glue layer thin and focused             | Build heavy abstraction layers                |
      | Switch implementations without changing interface | Rewrite agent code when a protocol evolves   |
    And the test is: if we remove MCP tomorrow, do our agents still compile?
    And the answer must be: yes — because agents depend on our interface, not on MCP
