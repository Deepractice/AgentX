/**
 * Sandbox Workspace Events
 *
 * Events for file system operations in the agent's workspace.
 */

import type { RuntimeEvent } from "~/ecosystem/event/runtime/RuntimeEvent";

/**
 * Base WorkspaceEvent
 */
export interface WorkspaceEvent<T extends string = string, D = unknown> extends RuntimeEvent<T, D> {
  source: "sandbox";
  category: "workspace";
}

// ============================================================================
// File Read Events
// ============================================================================

/**
 * FileReadRequest - Request to read a file
 */
export interface FileReadRequest extends WorkspaceEvent<"file_read_request"> {
  intent: "request";
  data: {
    path: string;
    encoding?: string;
  };
}

/**
 * FileReadResult - File read result
 */
export interface FileReadResult extends WorkspaceEvent<"file_read_result"> {
  intent: "result";
  data: {
    path: string;
    content: string;
    size: number;
    encoding: string;
  };
}

// ============================================================================
// File Write Events
// ============================================================================

/**
 * FileWriteRequest - Request to write a file
 */
export interface FileWriteRequest extends WorkspaceEvent<"file_write_request"> {
  intent: "request";
  data: {
    path: string;
    content: string;
    encoding?: string;
    createDirectories?: boolean;
  };
}

/**
 * FileWrittenEvent - File was written
 */
export interface FileWrittenEvent extends WorkspaceEvent<"file_written"> {
  intent: "result";
  data: {
    path: string;
    size: number;
    timestamp: number;
  };
}

// ============================================================================
// File Delete Events
// ============================================================================

/**
 * FileDeleteRequest - Request to delete a file
 */
export interface FileDeleteRequest extends WorkspaceEvent<"file_delete_request"> {
  intent: "request";
  data: {
    path: string;
    recursive?: boolean;
  };
}

/**
 * FileDeletedEvent - File was deleted
 */
export interface FileDeletedEvent extends WorkspaceEvent<"file_deleted"> {
  intent: "result";
  data: {
    path: string;
    timestamp: number;
  };
}

// ============================================================================
// Directory Events
// ============================================================================

/**
 * DirectoryListRequest - Request to list directory
 */
export interface DirectoryListRequest extends WorkspaceEvent<"directory_list_request"> {
  intent: "request";
  data: {
    path: string;
    recursive?: boolean;
    pattern?: string;
  };
}

/**
 * DirectoryListResult - Directory listing result
 */
export interface DirectoryListResult extends WorkspaceEvent<"directory_list_result"> {
  intent: "result";
  data: {
    path: string;
    entries: Array<{
      name: string;
      type: "file" | "directory";
      size?: number;
      modifiedAt?: number;
    }>;
  };
}

// ============================================================================
// Error Event
// ============================================================================

/**
 * WorkspaceErrorEvent - Workspace operation error
 */
export interface WorkspaceErrorEvent extends WorkspaceEvent<"workspace_error"> {
  intent: "notification";
  data: {
    operation: string;
    path: string;
    code: string;
    message: string;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllWorkspaceEvent - All workspace events
 */
export type AllWorkspaceEvent =
  | FileReadRequest
  | FileReadResult
  | FileWriteRequest
  | FileWrittenEvent
  | FileDeleteRequest
  | FileDeletedEvent
  | DirectoryListRequest
  | DirectoryListResult
  | WorkspaceErrorEvent;

/**
 * Workspace request events
 */
export type WorkspaceRequestEvent =
  | FileReadRequest
  | FileWriteRequest
  | FileDeleteRequest
  | DirectoryListRequest;

/**
 * Workspace result events
 */
export type WorkspaceResultEvent =
  | FileReadResult
  | FileWrittenEvent
  | FileDeletedEvent
  | DirectoryListResult;
