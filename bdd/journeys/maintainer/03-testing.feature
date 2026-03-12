@journey @maintainer
Feature: Testing Infrastructure
  As a maintainer, I provide testing tools,
  so contributors can verify their work without manual effort.

  Scenario: Projects use @deepracticex/bdd for test runner
    Given a project needs BDD testing
    Then it should create a "bdd/run.test.ts" entry file:
      """
      import { configure } from "@deepracticex/bdd";

      await configure({
        features: ["bdd/journeys/**/*.feature"],
        steps: ["bdd/support/**/*.ts", "bdd/steps/**/*.ts"],
        tags: "not @pending",
        timeout: 30_000,
      });
      """
    And run tests with "bun test bdd/"
    And the API (Given, When, Then, Before, After, World) is identical to @cucumber/cucumber

  Scenario: Projects use shared BDD utilities from devtools
    Given a project needs BDD testing utilities
    Then it should import from "@agentxjs/devtools/bdd":
      | utility              | purpose                                 |
      | agentUiTester        | AI-driven UI testing                    |
      | agentDocTester       | AI-driven document evaluation           |
      | startDevServer       | Dev server lifecycle                    |
      | paths                | Consistent path resolution              |
      | createCucumberConfig | Legacy Cucumber configuration (deprecated) |

  Scenario: UI scenarios are tested by agentUiTester
    Given a contributor writes a @ui scenario
    Then steps should accumulate instructions in an array
    And the After hook should call agentUiTester with all instructions
    And agentUiTester uses Claude CLI + agent-browser to test
    And it returns PASS or FAIL with a reason

  Scenario: Documentation is tested by agentDocTester
    Given a contributor writes documentation
    Then agentDocTester should evaluate the doc from reader's experience:
      | dimension    | what it checks                           |
      | Completeness | All required information is present      |
      | Logic        | Structure flows naturally, no jumps      |
      | Readability  | A newcomer can follow without confusion  |
    And it reads the file content and sends to Claude for review
    And it returns PASS or FAIL based on whether requirements are met

  Scenario: Running tests uses bun test
    Given a project with BDD tests
    Then these commands should work:
      | command                                      | what it does                    |
      | bun test bdd/                                | Run all BDD tests               |
      | bun test bdd/ --test-name-pattern "LLM"      | Run scenarios matching pattern  |
      | bun run bdd:ui                               | Run UI tests (opt-in)           |
      | bun run bdd:docs                             | Run documentation tests         |

  Scenario: VCR records and replays external API calls
    Given a journey that calls external APIs (e.g. LLM provider)
    Then it must use "createVcrCreateDriver" from devtools
    And VCR automatically decides mode based on fixture existence:
      | fixture file exists? | API key set? | mode      | what happens                          |
      | yes                  | —            | playback  | MockDriver replays events, no API call |
      | no                   | yes          | recording | RecordingDriver wraps real driver      |
      | no                   | no           | error     | Real API call fails (e.g. Forbidden)   |
    And fixtures are stored in the project's "bdd/fixtures/recording/" directory

  Scenario: VCR fixture naming follows scenario name
    Given a scenario named "Agent follows system prompt instructions"
    Then the fixture file name is derived by:
      | step | transform                  | result                                       |
      | 1    | lowercase                  | agent follows system prompt instructions      |
      | 2    | replace non-alphanumeric   | agent-follows-system-prompt-instructions      |
      | 3    | trim leading/trailing dash | agent-follows-system-prompt-instructions      |
      | 4    | append .json               | agent-follows-system-prompt-instructions.json |
    And the file is stored under the project's VCR fixtures directory

  Scenario: Re-recording a VCR fixture
    Given a maintainer needs to update a VCR recording
    Then they should:
      | step | action                                         |
      | 1    | Delete the existing fixture .json file          |
      | 2    | Set ANTHROPIC_API_KEY or DEEPRACTICE_API_KEY    |
      | 3    | Run `bun run bdd`                               |
      | 4    | VCR auto-records and saves the new fixture      |
    # Tip: fixture is saved on driver.dispose() after test completes
