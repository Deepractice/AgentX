import { openDatabase, type Database } from "commonxjs/sqlite";
import path from "node:path";

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
    db = openDatabase(dbPath);
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database): void {
  // System config table
  database.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Invite codes table
  database.exec(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      used_by TEXT,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (used_by) REFERENCES users(id)
    )
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Re-export types
export type { Database };
