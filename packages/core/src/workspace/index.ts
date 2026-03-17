/**
 * Workspace Module — low-level file system types.
 *
 * These types are used internally by AgentOS FileSystem implementations.
 * For tool injection, use @agentxjs/core/os instead.
 */

export type {
  FileChangeEvent,
  FileChangeHandler,
  FileEntry,
  FileStat,
  FileType,
  GlobOptions,
  GrepMatch,
  GrepOptions,
  ReadOptions,
  SearchableWorkspace,
  WatchableWorkspace,
  Workspace,
  WorkspaceProvider,
} from "./types";
export { isSearchable, isWatchable } from "./types";
