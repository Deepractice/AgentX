@journey @organization
Feature: Single vs Multi-Agent
  As a Deepractice member, I need to understand when single-agent is enough
  and when multi-agent collaboration becomes necessary, so I design systems
  that match the actual needs — not industry hype.

  # ============================================================================
  # Foundation: AI Is Between Human and Computer
  # ============================================================================
  #
  #  Human              AI                    Computer
  #  ┌──────────┐      ┌──────────────┐      ┌──────────┐
  #  │ Conscious │      │ Probabilistic│      │Deterministic│
  #  │ Creative  │      │ Intelligent  │      │ Precise   │
  #  │ Embodied  │      │ Electronic   │      │ Electronic│
  #  │ Limited   │      │ Scalable     │      │ Unlimited │
  #  │ context   │      │ but limited  │      │ storage   │
  #  └──────────┘      │ context      │      └──────────┘
  #                    └──────────────┘
  #
  #  AI has human-like intelligence but computer-like characteristics.
  #  This duality determines when it needs collaboration — and when it doesn't.
  #

  Scenario: Member understands AI's position between human and computer
    Given the foundational cognition about AI
    Then AI is a product between human and computer:
      | dimension      | human                    | AI                        | computer               |
      | Intelligence   | Conscious, creative      | Probabilistic, learned    | Deterministic, rule-based |
      | Medium         | Biological               | Electronic                | Electronic             |
      | Context        | Limited working memory    | Limited context window    | Unlimited storage      |
      | Specialization | Tends toward narrow expertise | Currently general-purpose | N/A                |
    And this hybrid nature determines how agents should be organized

  # ============================================================================
  # Why Humans Need Collaboration
  # ============================================================================

  Scenario: Member understands why humans collaborate
    Given humans have limited information capacity
    Then humans meet and collaborate to pool information:
      | human limitation                  | collaboration compensates by              |
      | Small working memory              | Multiple brains process in parallel       |
      | Tendency toward specialization    | Different experts cover different domains |
      | Cannot hold all context at once   | Team distributes the cognitive load       |
    And human specialization is a constraint — each person knows their narrow field
    And meetings exist because no single human can synthesize everything alone

  # ============================================================================
  # Why General Agents Don't Need Multi-Agent
  # ============================================================================

  Scenario: Member understands when single agent is sufficient
    Given AI does not have the human limitation of forced specialization
    Then a general-purpose agent has advantages over a human team:
      | advantage                          | why single agent is enough             |
      | Broad knowledge in one context     | No need to pool from multiple people   |
      | High information synthesis speed   | No communication overhead              |
      | No coordination cost               | No meetings, no misunderstanding       |
      | Consistent reasoning               | One mind, no conflicting interpretations|
    And for general tasks, a single agent is more efficient than multiple agents
    And adding agents to a general task adds coordination cost without information gain

  # ============================================================================
  # The Context Window: Intelligence's Fundamental Limit
  # ============================================================================

  Scenario: Member understands context limitation is fundamental, not temporary
    Given AI has a limited context window
    Then this is not an engineering problem that will be solved:
      | evidence                                                            |
      | Humans have long-term memory but still have limited working memory  |
      | A doctor with 30 years of experience still focuses on one patient at a time |
      | Intelligence requires focus — unlimited context means no focus      |
      | This is a property of intelligence itself, not a technical bottleneck |
    And the question "will context windows become infinite?" has the answer: no
    And therefore, the need for structured memory and collaboration is permanent

  # ============================================================================
  # Specialization Creates the Need for Multi-Agent
  # ============================================================================
  #
  #  General scenario:                Specialized scenario:
  #  ┌──────────────┐               ┌────────┐ ┌────────┐ ┌────────┐
  #  │ Single Agent  │               │Finance │ │ Legal  │ │  Tech  │
  #  │ Broad context │               │ Agent  │ │ Agent  │ │ Agent  │
  #  │ Synthesizes   │               │ Deep   │ │ Deep   │ │ Deep   │
  #  │ everything    │               │ Narrow │ │ Narrow │ │ Narrow │
  #  │ Sufficient    │               │        │ │        │ │        │
  #  └──────────────┘               └───┬────┘ └───┬────┘ └───┬────┘
  #                                     └──────────┼──────────┘
  #                                          Collaborate to
  #                                          compensate for
  #                                          information gaps
  #

  Scenario: Member understands why specialization leads to multi-agent
    Given we choose the specialization direction (from 05)
    Then specialization creates a chain of consequences:
      | step | consequence                                                  |
      | 1    | More specialized → more individual (narrower focus)          |
      | 2    | More individual → less information breadth per agent         |
      | 3    | Less breadth → context is spent on depth, not on breadth    |
      | 4    | Less breadth → cannot see the full picture alone             |
      | 5    | Cannot see full picture → needs other agents to fill gaps    |
    And therefore multi-agent is not a technology choice — it is the inevitable result of specialization
    And this mirrors human society exactly: the more specialized people become, the more they need teams

  Scenario: Member can decide when to use single vs multi-agent
    Given the relationship between specialization and multi-agent need
    Then the decision framework is:
      | scenario                          | agent type    | why                                    |
      | General task, broad context       | Single agent  | One agent synthesizes efficiently       |
      | Specialized B2B domain            | Multi-agent   | Each expert agent is narrow, needs coordination |
      | Simple execution task             | Single agent  | No information gaps to fill             |
      | Cross-domain business process     | Multi-agent   | No single agent covers all domains     |
    And the wrong approach is: "multi-agent because it's trendy"
    And the right approach is: "multi-agent because specialization demands it"

  # ============================================================================
  # Implication for AgentX Architecture
  # ============================================================================

  Scenario: Member understands what this means for AgentX
    Given multi-agent is the inevitable result of our specialization strategy
    Then AgentX must support both modes:
      | mode          | when                          | architecture requirement           |
      | Single agent  | General tasks, prototyping    | Already supported today            |
      | Multi-agent   | Specialized B2B scenarios     | Container/Image model must extend  |
    And the Container/Image/Session model is the foundation for multi-agent:
      | concept    | single-agent role    | multi-agent role                     |
      | Container  | One agent's namespace| A team's shared namespace            |
      | Image      | One agent's config   | One specialist's config              |
      | Session    | One conversation     | One collaboration thread             |
    And the architecture we build today must not block multi-agent tomorrow
