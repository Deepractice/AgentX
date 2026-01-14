/**
 * SQLite Database Abstraction Types
 *
 * Unified interface for Node.js (node:sqlite) and Bun (bun:sqlite)
 */

/**
 * Query execution result
 */
export interface RunResult {
  /** Number of rows changed */
  changes: number;
  /** Last inserted row ID */
  lastInsertRowid: number | bigint;
}

/**
 * Prepared statement
 */
export interface Statement {
  /** Execute statement with parameters, return result */
  run(...params: unknown[]): RunResult;
  /** Get single row */
  get(...params: unknown[]): unknown;
  /** Get all rows */
  all(...params: unknown[]): unknown[];
}

/**
 * Database connection
 */
export interface Database {
  /** Execute raw SQL (no return value) */
  exec(sql: string): void;
  /** Prepare a statement for execution */
  prepare(sql: string): Statement;
  /** Close the database connection */
  close(): void;
}
