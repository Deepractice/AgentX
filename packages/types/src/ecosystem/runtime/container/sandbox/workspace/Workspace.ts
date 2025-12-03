/**
 * Workspace
 *
 * Represents an isolated working directory for an Agent.
 * The actual path is determined by Runtime, not defined here.
 *
 * Workspace is a location declaration, not an operation interface.
 * Claude SDK has its own tools (Bash, file operations), we just
 * tell it where to work (cwd).
 */
export interface Workspace {
  /**
   * Unique workspace identifier
   */
  readonly id: string;

  /**
   * Human-readable workspace name
   */
  readonly name: string;

  /**
   * Absolute path to workspace directory
   *
   * Examples:
   * - NodeRuntime: ~/.agentx/workspaces/{id}/
   * - CloudRuntime: /workspace/ (in container)
   */
  readonly path: string;
}
