@journey @maintainer
Feature: Release and Publishing
  As a maintainer, I manage versioning and publishing,
  so packages reach npm reliably and consistently.

  # ============================================================================
  # Changesets Workflow
  # ============================================================================
  #
  #  Developer                      CI (GitHub Actions)
  #  ┌──────────────────┐           ┌───────────────────────────┐
  #  │ 1. Make changes   │           │                           │
  #  │ 2. bun changeset  │           │ On push to main:          │
  #  │ 3. Select packages│           │                           │
  #  │ 4. Write summary  │           │ If .changeset/ files:     │
  #  │ 5. Commit & PR    │──merge──→ │   → Create "Version PR"   │
  #  │                   │           │                           │
  #  │                   │           │ If Version PR merged:     │
  #  │                   │           │   → bun run build         │
  #  │                   │           │   → npm publish           │
  #  │                   │           │   → Git tag + GH release  │
  #  │                   │           │   → Docker build          │
  #  └──────────────────┘           └───────────────────────────┘
  #

  Scenario: Maintainer creates a changeset for a code change
    Given a maintainer has made changes to one or more packages
    When they run "bun changeset"
    Then they should:
      | step | action                                           |
      | 1    | Select which packages are affected               |
      | 2    | Choose bump type (patch / minor / major)         |
      | 3    | Write a human-readable summary of the change     |
    And a .changeset/*.md file should be committed with the PR

  Scenario: Maintainer understands fixed versioning
    Given the changeset config uses "fixed" mode
    Then all these packages are versioned together:
      | package               |
      | agentxjs              |
      | @agentxjs/runtime     |
      | @agentxjs/ui          |
      | @agentxjs/portagent   |
      | @agentxjs/persistence |
      | @agentxjs/network     |
      | @agentxjs/agent       |
      | @agentxjs/types       |
      | @agentxjs/common      |
    And bumping any one of them bumps all of them

  Scenario: CI creates a Version PR automatically
    Given a changeset file is merged to main
    Then the changesets GitHub Action should:
      | step | what happens                                     |
      | 1    | Run "bun run version" to bump package versions   |
      | 2    | Create a PR titled "chore: version packages"     |
      | 3    | The PR contains updated package.json and CHANGELOG |

  Scenario: CI publishes on Version PR merge
    Given the Version PR is merged to main
    Then the changesets GitHub Action should:
      | step | what happens                                     |
      | 1    | Build all packages with "bun run build"          |
      | 2    | Replace workspace:* with real version numbers    |
      | 3    | Publish to npm with "bun run release"            |
      | 4    | Create git tag (v{version})                      |
      | 5    | Create GitHub Release                            |
      | 6    | Trigger Docker build (post.yml)                  |

  Scenario: Packages are published with public access
    Given the changeset config has "access": "public"
    Then all packages should be published as public npm packages
    And npm provenance is enabled (id-token: write)
