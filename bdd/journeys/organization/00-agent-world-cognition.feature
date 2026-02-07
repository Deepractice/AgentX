@journey @organization
Feature: Agent World Cognition
  As a maintainer, I define the worldview behind AgentX,
  so every architectural decision traces back to a clear vision of the agent era.

  # ============================================================================
  # The Shift: From Heavy Enterprise to Thin Agent Layer
  # ============================================================================
  #
  #  Traditional Enterprise          AI Era
  #  ┌─────────────────────┐        ┌──────────────────────────┐
  #  │ Integration Layer    │        │ Integration = Agent      │
  #  │ Heavy code, ESB,     │        │ Thin, natural language,  │
  #  │ workflow engines      │        │ prompt-driven            │
  #  ├─────────────────────┤        ├──────────────────────────┤
  #  │ Compute Layer        │        │ Compute = LLM            │
  #  │ Business logic,      │        │ Sunk into foundation     │
  #  │ algorithms in code   │        │ models, not your system  │
  #  ├─────────────────────┤        ├──────────────────────────┤
  #  │ State Layer          │        │ State Layer              │
  #  │ Databases, storage   │        │ Still traditional infra  │
  #  └─────────────────────┘        └──────────────────────────┘
  #

  Scenario: Maintainer understands the traditional enterprise architecture
    Given the traditional enterprise software world
    Then business systems are composed of three tightly-coupled layers:
      | layer       | responsibility                          | characteristic |
      | State       | Databases, storage, persistence         | Heavy          |
      | Compute     | Business logic, algorithms, rules       | Heavy          |
      | Integration | Orchestrating workflows, connecting APIs | Heavy          |
    And all three layers are built with code, deployed together, hard to change

  Scenario: Maintainer understands how AI reshapes the architecture
    Given the emergence of large language models
    Then the three layers transform:
      | layer       | before                    | after                          |
      | State       | Traditional databases     | Still traditional databases    |
      | Compute     | Code in your system       | Sunk into LLMs and foundation models |
      | Integration | Code orchestrating code   | Agents orchestrating via natural language |
    And the compute layer is no longer your responsibility — it belongs to model providers
    And the integration layer is no longer software engineering — it is prompt engineering
    And the integration layer becomes inherently thin — it is just text, not code

  Scenario: Maintainer understands why the thin layer matters
    Given the integration layer is now natural language text
    Then it has fundamentally different properties than traditional software:
      | property      | traditional integration        | agent integration          |
      | Medium        | Code (heavy, compiled, typed)  | Text (light, interpreted)  |
      | Cost to change| Rewrite, redeploy, retest      | Edit a prompt              |
      | Portability   | Bound to runtime and platform  | Text runs anywhere         |
      | Coupling      | Tightly coupled to compute     | Decoupled — LLM is external|
    And a framework for this layer must respect its thinness
    And making it heavy would contradict its nature

  # ============================================================================
  # AgentX Mission: The Thin Integration Layer Framework
  # ============================================================================

  Scenario: Maintainer can state the AgentX mission
    Given the agent era where integration is thin and prompt-driven
    Then AgentX's mission is:
      """
      Build a lightweight, portable framework for the thin integration layer,
      so agents can flow freely across environments, providers, and platforms.
      """
    And this mission drives every architectural decision in the project

  Scenario: Maintainer understands the core design principles
    Given the AgentX mission
    Then these principles are non-negotiable:
      | principle       | reason                                              |
      | Lightweight     | The layer is thin — the framework must not be heavy  |
      | Low coupling    | Compute and state are external — never bind to them  |
      | Pluggable       | Providers change, platforms change — swap, don't rewrite |
      | Portable        | Agents should flow everywhere — no environment lock-in |
      | Low cost        | Thin layer means low infrastructure overhead         |
    And violating these principles means violating the project's reason to exist

  Scenario: Maintainer traces architecture back to principles
    Given the design principles
    Then the architecture embodies them:
      | architecture decision             | principle it serves          |
      | Core defines interfaces only      | Low coupling, pluggable      |
      | Driver abstracts LLM providers    | Pluggable, portable          |
      | Platform abstracts runtime        | Portable, low coupling       |
      | Container/Image/Session model     | Portable — agents are data   |
      | No heavy dependencies in core     | Lightweight                  |
    And a contributor who understands these principles can make correct design decisions independently
