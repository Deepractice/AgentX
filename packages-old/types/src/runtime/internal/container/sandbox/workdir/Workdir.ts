/**
 * Workdir - Working Directory
 *
 * Represents an isolated working directory for an Agent.
 * The actual path is determined by Runtime, not defined here.
 *
 * Workdir is a location declaration, not an operation interface.
 * Claude SDK has its own tools (Bash, file operations), we just
 * tell it where to work (cwd).
 */
export interface Workdir {
  /**
   * Unique workdir identifier
   */
  readonly id: string;

  /**
   * Human-readable workdir name
   */
  readonly name: string;

  /**
   * Absolute path to working directory
   *
   * Examples:
   * - NodeRuntime: ~/.agentx/workdirs/{id}/
   * - CloudRuntime: /workdir/ (in container)
   */
  readonly path: string;
}
