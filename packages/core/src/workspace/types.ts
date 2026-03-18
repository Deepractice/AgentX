/**
 * Workspace Types
 *
 * Platform-agnostic file operations abstraction for agents.
 * Different platforms provide different implementations:
 * - Node.js: fs/promises based (LocalWorkspace)
 * - Cloudflare: R2 based (future)
 * - Container: In-container filesystem (future)
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                   core/workspace                         │
 * │  ┌─────────────────────────────────────────────────────┐│
 * │  │  Workspace            (interface — basic file ops)  ││
 * │  │  SearchableWorkspace  (interface — grep + glob)     ││
 * │  │  WorkspaceProvider    (factory interface)            ││
 * │  └─────────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────────┘
 *                           │
 *          ┌────────────────┼────────────────┐
 *          ▼                ▼                ▼
 *   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 *   │ node-platform│ │  cf-platform │ │  container   │
 *   │ LocalWorkspace│ │ R2Workspace │ │              │
 *   └──────────────┘ └──────────────┘ └──────────────┘
 * ```
 */

// ============================================================================
// File Metadata
// ============================================================================

/**
 * FileType — file or directory
 */
export type FileType = "file" | "directory";

/**
 * FileStat — metadata about a file or directory
 */
export interface FileStat {
  /**
   * File or directory
   */
  type: FileType;

  /**
   * Size in bytes (0 for directories)
   */
  size: number;

  /**
   * Last modified time (epoch ms)
   */
  mtime: number;
}

/**
 * FileEntry — a single entry in a directory listing
 */
export interface FileEntry {
  /**
   * File or directory name (without path)
   */
  name: string;

  /**
   * Full path relative to workspace root
   */
  path: string;

  /**
   * File or directory
   */
  type: FileType;
}

// ============================================================================
// Read Options
// ============================================================================

/**
 * ReadOptions — control what portion of a file to read
 */
export interface ReadOptions {
  /**
   * Line offset to start reading from (1-based)
   */
  offset?: number;

  /**
   * Maximum number of lines to read
   */
  limit?: number;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * GrepMatch — a single match from a content search
 */
export interface GrepMatch {
  /**
   * File path relative to workspace root
   */
  file: string;

  /**
   * Line number (1-based)
   */
  line: number;

  /**
   * Matched line content
   */
  content: string;
}

/**
 * GrepOptions — options for content search
 */
export interface GrepOptions {
  /**
   * Glob pattern to filter files (e.g. "*.ts")
   */
  glob?: string;

  /**
   * Maximum number of results
   */
  maxResults?: number;

  /**
   * Case insensitive search
   */
  ignoreCase?: boolean;
}

/**
 * GlobOptions — options for file pattern matching
 */
export interface GlobOptions {
  /**
   * Subdirectory to search in (relative to workspace root)
   */
  cwd?: string;

  /**
   * Patterns to ignore
   */
  ignore?: string[];
}

// ============================================================================
// Workspace Interface
// ============================================================================

/**
 * Workspace — platform-agnostic file operations
 *
 * All paths are relative to the workspace root.
 * Implementations must enforce path safety — no access outside root.
 *
 * @example
 * ```typescript
 * const workspace: Workspace = new LocalWorkspace("/project");
 *
 * const content = await workspace.read("src/index.ts");
 * await workspace.write("output.txt", "Hello");
 * const entries = await workspace.list("src");
 * ```
 */
export interface Workspace {
  /**
   * Workspace root path
   */
  readonly root: string;

  /**
   * Read file content
   *
   * @param path - File path relative to workspace root
   * @param options - Optional read range (offset/limit in lines)
   * @returns File content as string
   */
  read(path: string, options?: ReadOptions): Promise<string>;

  /**
   * Write content to a file (create or overwrite)
   *
   * Creates parent directories if needed.
   *
   * @param path - File path relative to workspace root
   * @param content - Content to write
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Check if a path exists
   *
   * @param path - Path relative to workspace root
   * @returns true if the path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file or directory metadata
   *
   * @param path - Path relative to workspace root
   * @returns File metadata, or null if not found
   */
  stat(path: string): Promise<FileStat | null>;

  /**
   * Remove a file or directory
   *
   * @param path - Path relative to workspace root
   */
  remove(path: string): Promise<void>;

  /**
   * List directory entries
   *
   * @param path - Directory path relative to workspace root (default: ".")
   * @returns Array of directory entries
   */
  list(path?: string): Promise<FileEntry[]>;

  /**
   * Create a directory recursively
   *
   * @param path - Directory path relative to workspace root
   */
  mkdir(path: string): Promise<void>;
}

// ============================================================================
// Searchable Workspace
// ============================================================================

/**
 * SearchableWorkspace — extends Workspace with search capabilities
 *
 * Not all platforms support search (e.g. R2 doesn't have grep).
 * Use `isSearchable()` type guard to check.
 *
 * @example
 * ```typescript
 * if (isSearchable(workspace)) {
 *   const matches = await workspace.grep("TODO", { glob: "*.ts" });
 *   const files = await workspace.glob("src/*.test.ts");
 * }
 * ```
 */
export interface SearchableWorkspace extends Workspace {
  /**
   * Search file contents by regex pattern
   *
   * @param pattern - Regular expression pattern
   * @param options - Search options (file filter, max results)
   * @returns Array of matches
   */
  grep(pattern: string, options?: GrepOptions): Promise<GrepMatch[]>;

  /**
   * Find files matching a glob pattern
   *
   * @param pattern - Glob pattern (e.g. "src/*.ts")
   * @param options - Glob options (cwd, ignore)
   * @returns Array of matched file paths (relative to workspace root)
   */
  glob(pattern: string, options?: GlobOptions): Promise<string[]>;
}

// ============================================================================
// Type Guard
// ============================================================================

/**
 * Check if a workspace supports search operations (grep/glob)
 */
export function isSearchable(workspace: Workspace): workspace is SearchableWorkspace {
  return "grep" in workspace && "glob" in workspace;
}

// ============================================================================
// Watchable Workspace
// ============================================================================

/**
 * FileChangeEvent — emitted when a file or directory changes
 */
export interface FileChangeEvent {
  /**
   * Type of change
   */
  type: "create" | "change" | "delete";

  /**
   * Path relative to workspace root
   */
  path: string;
}

/**
 * FileChangeHandler — callback for file change events
 */
export type FileChangeHandler = (event: FileChangeEvent) => void;

/**
 * WatchableWorkspace — extends Workspace with watch capability
 *
 * Use `isWatchable()` type guard to check.
 */
export interface WatchableWorkspace extends Workspace {
  /**
   * Watch for file system changes in the workspace.
   *
   * @param handler - Callback for file change events
   * @returns Cleanup function to stop watching
   */
  watch(handler: FileChangeHandler): () => void;
}

/**
 * Check if a workspace supports watching
 */
export function isWatchable(workspace: Workspace): workspace is WatchableWorkspace {
  return "watch" in workspace;
}

// ============================================================================
// Workspace Provider
// ============================================================================

/**
 * WorkspaceProvider — factory that creates Workspace instances by ID.
 *
 * Like ContextProvider creates Context from roleId,
 * WorkspaceProvider creates Workspace from workspaceId.
 *
 * Platform packages provide implementations:
 * - Node.js: maps workspaceId to a subdirectory under a base path
 * - Cloudflare: maps workspaceId to an R2 prefix (future)
 *
 * @example
 * ```typescript
 * // Node.js platform
 * const provider = new LocalWorkspaceProvider("~/.deepractice/agentx/workspaces");
 * const workspace = await provider.create("ws_abc123");
 * // workspace.root = "~/.deepractice/agentx/workspaces/ws_abc123"
 * ```
 */
export interface WorkspaceProvider {
  /**
   * Create or open a workspace by ID.
   *
   * The workspace directory is created if it doesn't exist.
   *
   * @param workspaceId - Unique workspace identifier
   * @returns Workspace instance scoped to this ID
   */
  create(workspaceId: string): Promise<Workspace>;
}
