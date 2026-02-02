/**
 * SQLite Module - Unified SQLite abstraction for Bun and Node.js
 *
 * @example
 * ```typescript
 * import { openDatabase } from "@agentxjs/common";
 *
 * const db = openDatabase("./data.db");
 * db.exec("CREATE TABLE ...");
 * db.prepare("SELECT * FROM ...").all();
 * db.close();
 * ```
 */

export type { Database, Statement, RunResult } from "./types";
export { openDatabase } from "./database";
