@journey @maintainer
Feature: AI Agent Collaboration Workflow
  As a maintainer, I define how AI agents work on this project,
  so they follow the BDD-first approach and work efficiently in parallel.

  Scenario: Main agent discusses requirements with user
    Given an AI agent is working with a user
    Then the main agent should:
      | step | action                                    |
      | 1    | Discuss requirements with user            |
      | 2    | Write .feature + .steps.ts together       |
      | 3    | Spawn sub-agent for implementation        |
      | 4    | Continue discussing next feature          |

  Scenario: Sub-agent implements in background
    Given a sub-agent is spawned for implementation
    Then it should:
      | step | action                                    |
      | 1    | Read the feature + steps (the spec)       |
      | 2    | Implement code to satisfy the spec        |
      | 3    | Run bun run bdd → all pass                |
      | 4    | Report result back                        |
    And it should use run_in_background: true

  Scenario: AI agent tracks session state
    Given an AI agent is in BDD-driven mode
    Then it should end each response with:
      | format                                          |
      | 「BDD Driving」Next: [what we're doing next]     |
    And this reminds of the current workflow state across turns

  Scenario: AI agent reads feature files first
    Given an AI agent is asked to work on a feature
    Then it must read the BDD directory before writing any code
    And if no scenario exists for the request, write the feature first
    And never write code without a corresponding feature
