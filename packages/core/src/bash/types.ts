/**
 * Bash Types
 *
 * Abstraction for command execution capability.
 * Different platforms provide different implementations:
 * - Node.js: child_process based
 * - Docker: Container exec
 *
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │                     core/bash                        │
 * │  ┌─────────────────────────────────────────────────┐│
 * │  │  BashProvider (interface)                       ││
 * │  │  BashResult   (interface)                       ││
 * │  │  BashOptions  (interface)                       ││
 * │  └─────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────┘
 *                           │
 *          ┌────────────────┼────────────────┐
 *          ▼                ▼                ▼
 *   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 *   │ platform-node│ │platform-docker│ │  (future)    │
 *   │ ChildProcess │ │ ContainerExec│ │              │
 *   └──────────────┘ └──────────────┘ └──────────────┘
 * ```
 */

// ============================================================================
// Bash Result
// ============================================================================

/**
 * BashResult - Output from a command execution
 */
export interface BashResult {
  /**
   * Standard output
   */
  stdout: string;

  /**
   * Standard error
   */
  stderr: string;

  /**
   * Process exit code (0 = success)
   */
  exitCode: number;
}

// ============================================================================
// Bash Options
// ============================================================================

/**
 * BashOptions - Configuration for a single command execution
 */
export interface BashOptions {
  /**
   * Working directory for the command
   */
  cwd?: string;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Environment variables
   */
  env?: Record<string, string>;
}

// ============================================================================
// Bash Provider
// ============================================================================

/**
 * BashProvider - Abstraction for command execution
 *
 * Platform implementations provide this interface.
 * The provider is stateless — each execute() call is independent.
 *
 * @example
 * ```typescript
 * const result = await provider.execute("ls -la", { cwd: "/tmp" });
 * console.log(result.stdout);
 * console.log(result.exitCode); // 0
 * ```
 */
export interface BashProvider {
  /**
   * Provider type (e.g., "child-process", "docker")
   */
  readonly type: string;

  /**
   * Execute a shell command
   *
   * @param command - Shell command to execute
   * @param options - Execution options
   * @returns Command output and exit code
   */
  execute(command: string, options?: BashOptions): Promise<BashResult>;
}
