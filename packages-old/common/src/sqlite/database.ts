/**
 * SQLite Database Implementation
 *
 * Auto-detects runtime and uses:
 * - Bun: bun:sqlite (built-in)
 * - Node.js 22+: node:sqlite (built-in)
 */

import { dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import type { Database, Statement, RunResult } from "./types";

declare const Bun: unknown;

/**
 * Ensure parent directory exists for database file
 */
function ensureDir(path: string): void {
  if (path === ":memory:") return;
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Detect if running in Bun
 */
function isBun(): boolean {
  return typeof Bun !== "undefined";
}

/**
 * Detect if Node.js has built-in SQLite (22+)
 */
function hasNodeSqlite(): boolean {
  return (
    typeof globalThis.process?.getBuiltinModule === "function" &&
    globalThis.process.getBuiltinModule("node:sqlite") !== undefined
  );
}

/**
 * Open a SQLite database
 *
 * Automatically detects runtime:
 * - Bun → uses bun:sqlite
 * - Node.js 22+ → uses node:sqlite
 *
 * @param path - Database file path (use ":memory:" for in-memory)
 * @returns Database instance
 *
 * @example
 * ```typescript
 * import { openDatabase } from "@agentxjs/common";
 *
 * const db = openDatabase("./data/app.db");
 * db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");
 *
 * const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
 * stmt.run("Alice");
 *
 * const users = db.prepare("SELECT * FROM users").all();
 * console.log(users);
 *
 * db.close();
 * ```
 */
export function openDatabase(path: string): Database {
  // Ensure parent directory exists
  ensureDir(path);

  if (isBun()) {
    return openBunDatabase(path);
  }

  if (hasNodeSqlite()) {
    return openNodeDatabase(path);
  }

  throw new Error("No SQLite runtime available. Requires Bun or Node.js 22+ with built-in sqlite.");
}

/**
 * Open database using Bun's bun:sqlite
 */
function openBunDatabase(path: string): Database {
  // Dynamic require to avoid bundling issues

  const { Database: BunDatabase } = require("bun:sqlite");
  const db = new BunDatabase(path);

  return {
    exec(sql: string): void {
      db.exec(sql);
    },

    prepare(sql: string): Statement {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]): RunResult {
          const result = stmt.run(...params);
          return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
        get(...params: unknown[]): unknown {
          return stmt.get(...params);
        },
        all(...params: unknown[]): unknown[] {
          return stmt.all(...params);
        },
      };
    },

    close(): void {
      db.close();
    },
  };
}

/**
 * Open database using Node.js node:sqlite
 */
function openNodeDatabase(path: string): Database {
  const nodeSqlite = globalThis.process.getBuiltinModule("node:sqlite") as any;
  const { DatabaseSync } = nodeSqlite;
  const db = new DatabaseSync(path);

  return {
    exec(sql: string): void {
      db.exec(sql);
    },

    prepare(sql: string): Statement {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]): RunResult {
          const result = stmt.run(...params);
          return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
        get(...params: unknown[]): unknown {
          return stmt.get(...params);
        },
        all(...params: unknown[]): unknown[] {
          return stmt.all(...params);
        },
      };
    },

    close(): void {
      db.close();
    },
  };
}
