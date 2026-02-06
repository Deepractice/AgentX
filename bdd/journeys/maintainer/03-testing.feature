@journey @maintainer
Feature: Testing Infrastructure
  As a maintainer, I provide testing tools,
  so contributors can verify their work without manual effort.

  Scenario: Projects use shared BDD utilities
    Given a project needs BDD testing
    Then it should import from "@agentxjs/devtools/bdd":
      | utility              | purpose                        |
      | createCucumberConfig | Cucumber configuration         |
      | agentUiTester        | AI-driven UI testing           |
      | agentDocTester       | AI-driven document evaluation  |
      | startDevServer       | Dev server lifecycle           |
      | paths                | Consistent path resolution     |

  Scenario: UI scenarios are tested by agentUiTester
    Given a contributor writes a @ui scenario
    Then steps should accumulate instructions in an array
    And the After hook should call agentUiTester with all instructions
    And agentUiTester uses Claude CLI + agent-browser to test
    And it returns PASS or FAIL with a reason

  Scenario: Documentation is tested by agentDocTester
    Given a contributor writes documentation
    Then agentDocTester should evaluate the doc against requirements
    And it reads the file content and sends to Claude for review
    And it returns PASS or FAIL based on whether requirements are met

  Scenario: Running tests uses the bdd CLI
    Given a project with BDD tests
    Then these commands should work:
      | command                           | what it does                    |
      | bun run bdd                       | Run non-UI tests                |
      | bun run bdd:ui                    | Run UI tests (opt-in)           |
      | bun run bdd:ui -- --tags "@setup" | Run specific UI scenario        |
      | bun run bdd:docs                  | Run documentation tests         |

  Scenario: VCR records external API calls
    Given a journey that calls external APIs
    Then it must use "createVcrDriver" from devtools
    And VCR mode is controlled by VCR_MODE environment variable
    And fixtures are stored in the project's "bdd/fixtures/recording/"
