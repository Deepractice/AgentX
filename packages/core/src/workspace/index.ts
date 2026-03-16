/**
 * Workspace Module
 *
 * Platform-agnostic file operations abstraction for agents.
 * Platform packages provide concrete implementations.
 *
 * Usage:
 * ```typescript
 * import type { Workspace, SearchableWorkspace } from "@agentxjs/core/workspace";
 * import { isSearchable } from "@agentxjs/core/workspace";
 *
 * // Platform provides implementation
 * const workspace: Workspace = platform.workspace;
 *
 * const content = await workspace.read("src/index.ts");
 * await workspace.write("output.txt", "Hello");
 *
 * if (isSearchable(workspace)) {
 *   const matches = await workspace.grep("TODO", { glob: "*.ts" });
 * }
 * ```
 */

export {
  createEditTool,
  createGlobTool,
  createGrepTool,
  createListTool,
  createReadTool,
  createWorkspaceTools,
  createWriteTool,
} from "./tools";
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
