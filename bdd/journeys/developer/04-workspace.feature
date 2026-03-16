@journey @developer @pending
Feature: Workspace — Agent's Virtual Working Directory
  As a developer, I give my agent a workspace so it can read, write, and search files,
  regardless of where the files actually live (local fs, cloud R2, container).

  # ============================================================================
  # Core Concepts
  # ============================================================================

  Scenario: Developer understands the Workspace abstraction
    Given I am building an agent that needs file operations
    When I read the workspace documentation
    Then I should understand these concepts:
      | concept             | what it is                                          |
      | Workspace           | Platform-agnostic file operations interface          |
      | SearchableWorkspace | Extended interface with grep and glob capabilities   |
      | WorkspaceProvider   | Factory that creates Workspace instances (platform)  |
    And the relationship is: WorkspaceProvider creates Workspace, Agent uses Workspace

  # ============================================================================
  # Workspace Interface
  # ============================================================================

  Scenario: Workspace provides basic file operations
    Given a Workspace instance
    Then I can perform these operations:
      | method      | description                          |
      | read        | Read file content with optional range |
      | write       | Write content to a file               |
      | exists      | Check if a path exists                |
      | stat        | Get file metadata (size, type, mtime) |
      | remove      | Delete a file or directory            |
      | list        | List directory entries                 |
      | mkdir       | Create a directory recursively        |

  Scenario: SearchableWorkspace adds search capabilities
    Given a SearchableWorkspace instance
    Then I can also perform:
      | method | description                           |
      | grep   | Search file contents by regex pattern  |
      | glob   | Find files by glob pattern             |
    And not all platforms support search — it is optional

  # ============================================================================
  # Local Workspace
  # ============================================================================

  Scenario: Developer creates a local workspace for an agent
    Given I have installed agentxjs with node-platform
    When I create an agent with a workspace:
      """
      import { createAgentX } from "agentxjs";
      import { nodePlatform } from "@agentxjs/node-platform";
      import { createMonoDriver } from "@agentxjs/mono-driver";
      import { LocalWorkspace } from "@agentxjs/node-platform/workspace";

      const ax = createAgentX(nodePlatform({
        createDriver: (config) => createMonoDriver({ ...config, apiKey }),
        workspace: new LocalWorkspace("/path/to/project"),
      }));
      """
    Then the agent has read/write/edit/grep/glob/list tools automatically
    And all file operations are scoped to /path/to/project

  # ============================================================================
  # Built-in Workspace Tools
  # ============================================================================

  Scenario: Agent gets 6 built-in workspace tools
    Given an agent is created with a workspace
    Then these tools are automatically available to the LLM:
      | tool  | description                                     |
      | read  | Read file content, supports offset and limit     |
      | write | Create or overwrite a file                       |
      | edit  | Replace exact string matches in a file            |
      | grep  | Search file contents by regex pattern             |
      | glob  | Find files matching a glob pattern                |
      | list  | List directory contents                           |
    And tools are only injected when workspace is provided (backward compatible)

  # ============================================================================
  # Path Safety
  # ============================================================================

  Scenario: Workspace enforces path safety
    Given a workspace rooted at "/project"
    When the agent tries to access "../../../etc/passwd"
    Then the operation is rejected with a path safety error
    And no file outside the workspace root can be accessed
