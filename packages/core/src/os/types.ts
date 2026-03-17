/**
 * AgentOS Types — Unified operating system abstraction for agents.
 *
 * Merges file system (Workspace) and shell (Bash) into a single OS concept.
 * The agent sees one coherent computer — fs and sh share the same filesystem.
 *
 * Reference: E2B sandbox.files + sandbox.commands pattern.
 *
 * ```
 * ┌──────────────────────────────────────┐
 * │              AgentOS                  │
 * │                                      │
 * │   os.fs    — file operations         │
 * │   os.sh    — shell & processes       │
 * │   os.env   — environment info        │
 * │                                      │
 * ├──────────────────────────────────────┤
 * │         Platform Implementation       │
 * │   LocalOS / ContainerOS / CloudOS    │
 * └──────────────────────────────────────┘
 * ```
 */

// ============================================================================
// File System
// ============================================================================

/** File or directory */
export type FileType = "file" | "directory";

/** File metadata */
export interface FileStat {
  type: FileType;
  /** Size in bytes (0 for directories) */
  size: number;
  /** Last modified time (epoch ms) */
  mtime: number;
}

/** Directory entry */
export interface FileEntry {
  /** Name (without path) */
  name: string;
  /** Full path relative to OS root */
  path: string;
  type: FileType;
}

/** Read options — control line range */
export interface ReadOptions {
  /** Line offset to start from (1-based) */
  offset?: number;
  /** Maximum number of lines */
  limit?: number;
}

/**
 * FileSystem — file operations within the OS.
 *
 * All paths are relative to the OS root.
 * Implementations enforce path safety — no access outside root.
 */
export interface FileSystem {
  /** Read file content */
  read(path: string, options?: ReadOptions): Promise<string>;

  /** Write content to file (create or overwrite). Creates parent dirs. */
  write(path: string, content: string): Promise<void>;

  /** Check if path exists */
  exists(path: string): Promise<boolean>;

  /** Get file/directory metadata, null if not found */
  stat(path: string): Promise<FileStat | null>;

  /** Remove file or directory */
  remove(path: string): Promise<void>;

  /** List directory entries */
  list(path?: string): Promise<FileEntry[]>;

  /** Create directory recursively */
  mkdir(path: string): Promise<void>;
}

// ============================================================================
// Shell
// ============================================================================

/** Options for synchronous command execution */
export interface ExecOptions {
  /** Working directory (relative to OS root, default: root) */
  cwd?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
}

/** Result of a synchronous command */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Options for starting a background process */
export interface StartOptions {
  /** Working directory (relative to OS root) */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
}

/** Handle to a running background process */
export interface ProcessHandle {
  /** Process identifier */
  pid: string;
  /** The command that was started */
  command: string;
}

/** Info about a running process */
export interface ProcessInfo {
  pid: string;
  command: string;
  /** Running or exited */
  state: "running" | "exited";
  /** Exit code if exited */
  exitCode?: number;
}

/**
 * Shell — command execution within the OS.
 *
 * Shell commands run in the same filesystem as fs operations.
 * Default cwd is the OS root.
 */
export interface Shell {
  /** Execute a command synchronously, wait for completion */
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;

  /** Start a background process, return immediately */
  start(command: string, options?: StartOptions): Promise<ProcessHandle>;

  /** List running/recent processes */
  list(): Promise<ProcessInfo[]>;

  /** Kill a background process */
  kill(pid: string): Promise<void>;
}

// ============================================================================
// Environment
// ============================================================================

/**
 * Environment — OS-level information.
 */
export interface Environment {
  /** Root directory (the OS's filesystem root) */
  readonly cwd: string;

  /** Platform type */
  readonly platform: string;

  /** Get environment variables */
  vars(): Record<string, string>;
}

// ============================================================================
// AgentOS
// ============================================================================

/**
 * AgentOS — unified operating system for an agent.
 *
 * Combines file system, shell, and environment into one coherent interface.
 * The agent sees a single computer — write a file with fs, run it with sh.
 */
export interface AgentOS {
  /** File system operations */
  readonly fs: FileSystem;

  /** Shell & process management */
  readonly sh: Shell;

  /** Environment information */
  readonly env: Environment;
}

// ============================================================================
// OS Provider
// ============================================================================

/**
 * OSProvider — factory that creates AgentOS instances by ID.
 *
 * Each agent image has an osId.
 * The provider creates an isolated OS environment for each agent.
 *
 * Platform packages provide implementations:
 * - Node.js: LocalOS (shared filesystem + child_process)
 * - Cloud: ContainerOS (WebContainer/Docker, future)
 */
export interface OSProvider {
  /**
   * Create or open an OS environment by ID.
   *
   * @param osId - Unique identifier for the OS instance
   * @returns AgentOS instance scoped to this ID
   */
  create(osId: string): Promise<AgentOS>;
}
