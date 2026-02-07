@journey @organization
Feature: BDD as Operating Model
  As a Deepractice member, I need to understand why BDD is our operating model,
  so I work through feature files — the universal interface between humans and AI.

  # ============================================================================
  # The AI Era Division of Labor
  # ============================================================================
  #
  #  ┌──────────────────────────────────────────────────────────┐
  #  │  Human                                                   │
  #  │  Touches the real world → discovers problems → defines   │
  #  │  requirements → converts practice into innovation        │
  #  │  (AI cannot do this — it cannot enter the real world)    │
  #  │                                                          │
  #  │              ↕  Feature Files (natural language)          │
  #  │                                                          │
  #  │  AI                                                      │
  #  │  Receives requirements → writes code → executes →        │
  #  │  validates → reports back                                │
  #  │  (Humans no longer need to do this)                      │
  #  └──────────────────────────────────────────────────────────┘
  #

  Scenario: Member understands why humans are still essential
    Given AI can now write most of the code
    But AI cannot enter the real world
    Then humans remain essential because:
      | human capability                | why AI cannot replace it            |
      | Observe real-world problems     | AI has no physical presence         |
      | Talk to users and customers     | AI has no social context            |
      | Judge product-market fit        | AI has no business intuition        |
      | Convert practice to innovation  | AI can only recombine existing data |
    And the human role shifts from "writing code" to "defining intent"

  Scenario: Member understands why AI handles implementation
    Given AI coding agents can replace most programming tasks
    Then AI is better suited for implementation because:
      | AI capability                    | why humans should not do it       |
      | Write code from specs            | Faster, cheaper, tireless         |
      | Run tests and fix failures       | Instant feedback loop             |
      | Refactor across large codebases  | No context window fatigue         |
      | Work in parallel on many tasks   | No human coordination overhead    |
    And the old model of "humans write code, tests verify" is obsolete
    And the new model is "humans write features, AI writes everything else"

  # ============================================================================
  # Feature Files: The Universal Interface
  # ============================================================================

  Scenario: Member understands the feature file as collaboration protocol
    Given the division of labor between humans and AI
    Then the feature file is the interface between them:
      | role                   | what it does                                      |
      | Information transfer   | Natural language that both humans and AI understand|
      | Requirements carrier   | The single source of product intent                |
      | Iteration driver       | Each scenario is a concrete, verifiable goal       |
      | Collaboration protocol | Human ↔ AI, AI ↔ AI, Human ↔ Human                |
    And nothing else serves all four roles simultaneously

  Scenario: Member understands feature files connect all participants
    Given a feature file written in natural language
    Then it serves as the interface for every collaboration pair:
      | pair             | how the feature file helps                         |
      | Human ↔ AI       | Human defines intent, AI implements and verifies   |
      | AI ↔ AI          | Main agent writes features, sub-agent implements   |
      | Human ↔ Human    | Product and engineering align on one document       |
      | Present ↔ Future | Features are living documentation that outlives code|

  # ============================================================================
  # BDD Connects to the World Cognition
  # ============================================================================

  Scenario: Member sees BDD as the natural operating model for the thin layer
    Given the integration layer is now natural language (from 00-agent-world-cognition)
    And feature files are written in natural language
    Then BDD is not a "development methodology" we chose
    And it is the natural operating model for the thin integration layer era:
      | thin layer property          | BDD manifestation                     |
      | Integration is text          | Features are text                     |
      | Layer is thin and light      | Features are concise, not heavy specs |
      | Components are pluggable     | Implementation can be swapped freely  |
      | Agents drive the integration | AI agents execute from features       |

  # ============================================================================
  # BDD is More Than Testing
  # ============================================================================

  Scenario: Member stops thinking of BDD as a testing tool
    Given the traditional view of BDD is "behavior-driven development"
    Then in Deepractice, BDD means much more:
      | traditional view             | Deepractice view                            |
      | Test automation framework    | Operating model for human-AI collaboration  |
      | Acceptance criteria          | The only artifact humans need to produce    |
      | Developer workflow           | Organization-wide operating protocol        |
      | Optional best practice       | Non-negotiable way of working               |
    And we do not write features because we practice BDD
    And we practice BDD because features are the right interface for the AI era

  Scenario: Member understands the BDD workflow in practice
    Given BDD is our operating model
    Then the daily workflow is:
      | step | who   | action                                             |
      | 1    | Human | Observe the real world, identify what to build     |
      | 2    | Human | Write .feature file — define intent in scenarios   |
      | 3    | AI    | Read feature, write step definitions and code      |
      | 4    | AI    | Run tests, fix failures, iterate until green       |
      | 5    | Human | Review result, accept or refine the feature        |
    And humans spend most time on step 1 and 2 — the thinking
    And AI spends most time on step 3 and 4 — the execution
    And step 5 closes the loop — human validates against real-world intent
