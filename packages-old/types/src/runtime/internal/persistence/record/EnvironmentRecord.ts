/**
 * EnvironmentRecord - Storage for Environment implementation private state
 *
 * Used by Environment implementations (Receptor + Effector) to store
 * their private state that maps to our Session. The business layer
 * doesn't care about the internal structure of `state`.
 *
 * Examples:
 * - ClaudeEnvironment: { sdkSessionId: "claude_xxx" }
 * - OpenAIEnvironment: { threadId: "thread_xxx" }
 * - CustomEnvironment: any implementation-specific data
 *
 * Relationship:
 * ```
 * SessionRecord (business layer)
 *     │
 *     │ sessionId
 *     ▼
 * EnvironmentRecord (implementation layer)
 *     │
 *     │ state (opaque to business layer)
 *     ▼
 * External SDK/API state
 * ```
 */

/**
 * EnvironmentRecord - Environment implementation private state storage
 */
export interface EnvironmentRecord {
  /**
   * Associated session ID (foreign key to SessionRecord)
   */
  sessionId: string;

  /**
   * Environment type identifier
   * Examples: "claude", "openai", "custom"
   */
  environmentType: string;

  /**
   * Environment private state (opaque to business layer)
   * Structure is defined by each Environment implementation
   */
  state: Record<string, unknown>;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix milliseconds)
   */
  updatedAt: number;
}
