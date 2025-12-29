/**
 * Runtime Environment Configuration
 *
 * Global runtime settings that don't need to be passed through layers.
 * Used internally by RuntimeEnvironment singleton.
 */
export interface RuntimeEnvironmentConfig {
  /**
   * Path to Claude Code executable
   * Required for binary distribution where Claude Code is bundled
   * @example "/path/to/dist/claude-code/cli.js"
   */
  claudeCodePath?: string;

  // Future extensions:
  // workspaceRoot?: string;
  // globalMcpServers?: Record<string, McpServerConfig>;
}
