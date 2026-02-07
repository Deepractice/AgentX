@journey @organization
Feature: BDD-Driven Project Management
  As a Deepractice member, I need to understand how the organization manages
  all projects through a top-down BDD-driven approach, so every sub-project
  is aligned and driven from a single source of truth.

  # ============================================================================
  # The Corporate Analogy
  # ============================================================================
  #
  #  Deepractice repo = 总经办 (HQ / General Office)
  #  ├── Sets strategy, worldview, and organizational standards
  #  ├── Drives all business units through shared organization features
  #  │
  #  ├── opensource/ = 各事业部 (Business Units)
  #  │   ├── AgentX    — 身体事业部 (Agent runtime)
  #  │   ├── PromptX   — 大脑事业部 (Agent definition)
  #  │   ├── ToolX     — 双手事业部 (Tool integration)
  #  │   ├── ResourceX — 市场事业部 (Resource sharing)
  #  │   ├── Sandbox   — 安全事业部 (Secure runtime)
  #  │   └── CommonX   — 共享服务中心 (Shared infrastructure)
  #  │   Each BU operates independently but aligns with HQ strategy
  #  │
  #  └── services/ = 总经办直属业务 (HQ's Direct Business)
  #      The closed-source cloud platform — where revenue is generated
  #      Open-source BUs feed into the cloud platform (flywheel)
  #
  #  Direction: 总经办 → 事业部 → 具体实现
  #  Driving:   Worldview → Governance → Implementation
  #

  # ============================================================================
  # Top-Down BDD Driving
  # ============================================================================
  #
  #  Deepractice (top level)
  #  ├── bdd/journeys/organization/    ← 集团章程：shared worldview
  #  ├── opensource/
  #  │   ├── AgentX/   (submodule)
  #  │   │   └── bdd/journeys/
  #  │   │       ├── maintainer/       ← 事业部管理规范
  #  │   │       ├── contributor/      ← 事业部编码指南
  #  │   │       └── developer/        ← 事业部产品文档
  #  │   ├── PromptX/  (submodule)
  #  │   │   └── bdd/journeys/...
  #  │   ├── ToolX/    (submodule)
  #  │   ├── ResourceX/(submodule)
  #  │   └── ...
  #  └── services/                     ← 总经办直属：cloud services
  #

  Scenario: Member understands the corporate structure analogy
    Given the Deepractice repository is the top-level management layer
    Then it functions like a corporate headquarters (总经办):
      | structure              | corporate analogy          | responsibility                     |
      | Deepractice repo       | 总经办 (HQ)                | Strategy, worldview, standards     |
      | opensource/ projects   | 事业部 (Business Units)    | Independent R&D, aligned with HQ   |
      | services/ cloud        | 总经办直属业务              | Revenue generation (cloud platform)|
      | CommonX                | 共享服务中心               | Shared infrastructure across BUs   |
      | organization features  | 集团章程                   | All BUs must follow                |
    And each business unit (open-source project) operates independently:
      | autonomy                          | alignment                              |
      | Own git history and releases      | Must follow organization features      |
      | Own maintainer/contributor guides | Must not contradict HQ strategy        |
      | Own BDD tests and CI              | Must serve the circulation mission     |
    And HQ's direct business (cloud platform) is where the flywheel monetizes:
      | flywheel role                     | corporate analogy                      |
      | Open-source BUs attract developers| 事业部引流                              |
      | Cloud platform converts to revenue| 总经办直属业务变现                       |
      | Revenue reinvests in BUs          | 集团反哺事业部                          |

  Scenario: Member understands the driving hierarchy
    Given Deepractice manages multiple open-source and closed-source projects
    Then the BDD-driven management flows top-down:
      | level        | where                          | what it drives                    |
      | Organization | Deepractice/bdd/journeys/organization/ | Worldview, mission, principles    |
      | Project      | each project's bdd/journeys/maintainer/| Project governance, conventions   |
      | Contributor  | each project's bdd/journeys/contributor/| Coding guides, package specifics |
      | Developer    | each project's bdd/journeys/developer/ | SDK usage, API documentation     |
    And organization level is shared across ALL projects
    And project level is specific to each project (AgentX, PromptX, ToolX, etc.)

  Scenario: Member understands organization features are the shared source of truth
    Given the organization features define worldview and principles
    Then every sub-project inherits and must align with them:
      | organization feature              | all projects must follow                |
      | 00 - Thin integration layer       | Keep frameworks lightweight             |
      | 01 - Organization mission         | Serve the circulation mission           |
      | 02 - BDD as operating model       | Use features as the human-AI interface  |
      | 03 - Agent layer permanence       | Prioritize architecture over features   |
      | 04 - Agent era assets             | Treat resources as core assets          |
      | 05 - Specialization over generality| Build professional, not general-purpose |
      | 06 - Single vs multi-agent        | Design for future multi-agent needs     |
      | 07 - Protocol as interface         | Own the interface, delegate implementation |
      | 08 - Cloud and centralization     | Cloud-first for distribution            |
    And a sub-project's maintainer features must not contradict organization features
    And if there is a conflict, organization level wins

  # ============================================================================
  # Repository Structure
  # ============================================================================

  Scenario: Member understands the repository structure
    Given Deepractice is the top-level repository
    Then it contains all projects as git submodules under opensource/:
      | submodule    | project    | role in AgentVM          |
      | AgentX       | Agent runtime engine   | 身体 — running agents   |
      | PromptX      | Agent definition       | 大脑 — defining agents  |
      | ToolX        | Tool integration       | 双手 — using tools      |
      | ResourceX    | Resource management    | 市场 — sharing resources|
      | Sandbox      | Secure runtime         | 工作间 — safe execution |
      | CommonX      | Shared infrastructure  | 基建 — cross-project utils |
    And closed-source services live under services/:
      | service      | purpose                              |
      | account      | User authentication and management   |
      | agent        | Agent hosting and execution          |
      | runtime      | Cloud runtime environment            |
      | router       | Request routing                      |
      | registry     | Resource registry                    |
      | business     | Business plan and documentation      |
    And each submodule maintains its own independent git history
    And Deepractice locks each submodule to a specific version

  # ============================================================================
  # How Driving Works in Practice
  # ============================================================================

  Scenario: Member understands how BDD drives from top to bottom
    Given a new initiative starts at the organization level
    Then the driving flow is:
      | step | level        | action                                           |
      | 1    | Organization | Identify need from worldview/mission              |
      | 2    | Organization | Write or update organization feature if needed    |
      | 3    | Project      | Translate into project-level maintainer features  |
      | 4    | Contributor  | Break down into contributor-level coding features |
      | 5    | Sub-agent    | AI implements code driven by features             |
      | 6    | Validation   | BDD tests pass at all levels                      |
    And the human thinks top-down (organization → project → code)
    And the AI executes bottom-up (code → tests pass → features satisfied)

  Scenario: Member understands cross-project coordination
    Given multiple projects are driven from the same organization features
    Then cross-project work is coordinated at the Deepractice level:
      | scenario                          | how it is managed                       |
      | New protocol affects multiple projects | Organization feature defines intent, each project implements |
      | Shared dependency update (CommonX)| Deepractice-level feature drives the change across submodules |
      | New product added to AgentVM      | Organization feature first, then new submodule |
      | Release coordination              | Deepractice-level CI/CD orchestrates submodule versions |
    And no sub-project drives changes that affect other sub-projects independently
    And cross-cutting concerns are always driven from the Deepractice level

  # ============================================================================
  # Open Source and Closed Source Boundary
  # ============================================================================

  Scenario: Member understands the open/closed boundary
    Given Deepractice contains both open and closed source
    Then the boundary is clear:
      | open source (opensource/)         | closed source (services/, packages/)    |
      | Agent frameworks and protocols    | Cloud platform services                 |
      | Can be used independently         | Depends on open-source components       |
      | Community-driven development      | Internal team development               |
      | Published to npm/GitHub           | Deployed to cloud infrastructure        |
    And organization features apply to BOTH open and closed source
    And the worldview and principles do not change based on license
    And open source flows toward closed source: frameworks → cloud platform (flywheel)
