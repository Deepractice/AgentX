/**
 * Sandbox Workdir Events
 *
 * Events for file system operations in the agent's working directory.
 *
 * All WorkdirEvents have:
 * - source: "sandbox"
 * - category: "workdir"
 * - intent: "request" | "result" | "notification"
 */

import type { SystemEvent } from "~/event/base";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base WorkdirRequest
 */
interface BaseWorkdirRequest<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "workdir", "request"> {}

/**
 * Base WorkdirResult
 */
interface BaseWorkdirResult<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "workdir", "result"> {}

/**
 * Base WorkdirNotification
 */
interface BaseWorkdirNotification<T extends string, D = unknown>
  extends SystemEvent<T, D, "sandbox", "workdir", "notification"> {}

// ============================================================================
// File Read Events
// ============================================================================

/**
 * FileReadRequest - Request to read a file
 */
export interface FileReadRequest
  extends BaseWorkdirRequest<
    "file_read_request",
    {
      path: string;
      encoding?: string;
    }
  > {}

/**
 * FileReadResult - File read result
 */
export interface FileReadResult
  extends BaseWorkdirResult<
    "file_read_result",
    {
      path: string;
      content: string;
      size: number;
      encoding: string;
    }
  > {}

// ============================================================================
// File Write Events
// ============================================================================

/**
 * FileWriteRequest - Request to write a file
 */
export interface FileWriteRequest
  extends BaseWorkdirRequest<
    "file_write_request",
    {
      path: string;
      content: string;
      encoding?: string;
      createDirectories?: boolean;
    }
  > {}

/**
 * FileWrittenEvent - File was written
 */
export interface FileWrittenEvent
  extends BaseWorkdirResult<
    "file_written",
    {
      path: string;
      size: number;
      timestamp: number;
    }
  > {}

// ============================================================================
// File Delete Events
// ============================================================================

/**
 * FileDeleteRequest - Request to delete a file
 */
export interface FileDeleteRequest
  extends BaseWorkdirRequest<
    "file_delete_request",
    {
      path: string;
      recursive?: boolean;
    }
  > {}

/**
 * FileDeletedEvent - File was deleted
 */
export interface FileDeletedEvent
  extends BaseWorkdirResult<
    "file_deleted",
    {
      path: string;
      timestamp: number;
    }
  > {}

// ============================================================================
// Directory Events
// ============================================================================

/**
 * DirectoryListRequest - Request to list directory
 */
export interface DirectoryListRequest
  extends BaseWorkdirRequest<
    "directory_list_request",
    {
      path: string;
      recursive?: boolean;
      pattern?: string;
    }
  > {}

/**
 * DirectoryListResult - Directory listing result
 */
export interface DirectoryListResult
  extends BaseWorkdirResult<
    "directory_list_result",
    {
      path: string;
      entries: Array<{
        name: string;
        type: "file" | "directory";
        size?: number;
        modifiedAt?: number;
      }>;
    }
  > {}

// ============================================================================
// Error Event
// ============================================================================

/**
 * WorkdirErrorEvent - Workdir operation error
 */
export interface WorkdirErrorEvent
  extends BaseWorkdirNotification<
    "workdir_error",
    {
      operation: string;
      path: string;
      code: string;
      message: string;
    }
  > {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * WorkdirEvent - All workdir events
 */
export type WorkdirEvent =
  | FileReadRequest
  | FileReadResult
  | FileWriteRequest
  | FileWrittenEvent
  | FileDeleteRequest
  | FileDeletedEvent
  | DirectoryListRequest
  | DirectoryListResult
  | WorkdirErrorEvent;

/**
 * Workdir request events
 */
export type WorkdirRequestEvent =
  | FileReadRequest
  | FileWriteRequest
  | FileDeleteRequest
  | DirectoryListRequest;

/**
 * Workdir result events
 */
export type WorkdirResultEvent =
  | FileReadResult
  | FileWrittenEvent
  | FileDeletedEvent
  | DirectoryListResult;

/**
 * Type guard: is this a WorkdirEvent?
 */
export function isWorkdirEvent(event: SystemEvent): event is WorkdirEvent {
  return event.source === "sandbox" && event.category === "workdir";
}
