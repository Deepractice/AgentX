/**
 * SQLiteRepository - better-sqlite3 implementation of Repository
 *
 * Lightweight, synchronous SQLite storage for images, sessions, and messages.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 *
 * @example
 * ```typescript
 * import { SQLiteRepository } from "@agentxjs/node-ecosystem";
 *
 * const repository = new SQLiteRepository("./data/agentx.db");
 * ```
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Repository,
  ContainerRecord,
  DefinitionRecord,
  ImageRecord,
  SessionRecord,
  MessageRecord,
  MessageRole,
  EnvironmentRecord,
} from "@agentxjs/types";

/**
 * Convert Date, string, or number to ISO string
 * Handles JSON deserialization where Date becomes string or number
 */
function toISOString(value: Date | string | number): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value; // Assume already ISO string
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  throw new Error(`Invalid date value: ${value}`);
}

export class SQLiteRepository implements Repository {
  private db: Database.Database;

  // Definition storage (in-memory, code-defined)
  private definitions = new Map<string, DefinitionRecord>();

  constructor(dbPath: string = ":memory:") {
    // Ensure parent directory exists (skip for in-memory database)
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS containers (
        containerId TEXT PRIMARY KEY,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        config TEXT
      );

      CREATE TABLE IF NOT EXISTS images (
        imageId TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        definitionName TEXT NOT NULL,
        parentImageId TEXT,
        definition TEXT NOT NULL,
        config TEXT NOT NULL DEFAULT '{}',
        messages TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_images_definitionName ON images(definitionName);
      CREATE INDEX IF NOT EXISTS idx_images_type ON images(type);

      CREATE TABLE IF NOT EXISTS environments (
        sessionId TEXT PRIMARY KEY,
        environmentType TEXT NOT NULL,
        state TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(environmentType);

      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        containerId TEXT NOT NULL,
        imageId TEXT NOT NULL,
        title TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_imageId ON sessions(imageId);
      CREATE INDEX IF NOT EXISTS idx_sessions_containerId ON sessions(containerId);

      CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);
    `);

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");
  }

  // ==================== Container ====================

  async saveContainer(record: ContainerRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO containers (containerId, createdAt, updatedAt, config)
      VALUES (@containerId, @createdAt, @updatedAt, @config)
      ON CONFLICT(containerId) DO UPDATE SET
        updatedAt = @updatedAt,
        config = @config
    `);

    stmt.run({
      containerId: record.containerId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      config: record.config ? JSON.stringify(record.config) : null,
    });
  }

  async findContainerById(containerId: string): Promise<ContainerRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM containers WHERE containerId = ?");
    const row = stmt.get(containerId) as ContainerRow | undefined;

    if (!row) return null;

    return this.toContainerRecord(row);
  }

  async findAllContainers(): Promise<ContainerRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM containers ORDER BY createdAt DESC");
    const rows = stmt.all() as ContainerRow[];

    return rows.map((row) => this.toContainerRecord(row));
  }

  async deleteContainer(containerId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM containers WHERE containerId = ?");
    stmt.run(containerId);
  }

  async containerExists(containerId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM containers WHERE containerId = ?");
    return stmt.get(containerId) !== undefined;
  }

  // ==================== Definition (in-memory) ====================

  async saveDefinition(record: DefinitionRecord): Promise<void> {
    this.definitions.set(record.name, record);
  }

  async findDefinitionByName(name: string): Promise<DefinitionRecord | null> {
    return this.definitions.get(name) ?? null;
  }

  async findAllDefinitions(): Promise<DefinitionRecord[]> {
    return Array.from(this.definitions.values());
  }

  async deleteDefinition(name: string): Promise<void> {
    this.definitions.delete(name);
  }

  async definitionExists(name: string): Promise<boolean> {
    return this.definitions.has(name);
  }

  // ==================== Image ====================

  async saveImage(record: ImageRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO images (imageId, type, definitionName, parentImageId, definition, config, messages, createdAt)
      VALUES (@imageId, @type, @definitionName, @parentImageId, @definition, @config, @messages, @createdAt)
      ON CONFLICT(imageId) DO UPDATE SET
        type = @type,
        definitionName = @definitionName,
        parentImageId = @parentImageId,
        definition = @definition,
        config = @config,
        messages = @messages
    `);

    stmt.run({
      imageId: record.imageId,
      type: record.type,
      definitionName: record.definitionName,
      parentImageId: record.parentImageId,
      definition: JSON.stringify(record.definition),
      config: JSON.stringify(record.config),
      messages: JSON.stringify(record.messages),
      createdAt: toISOString(record.createdAt),
    });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM images WHERE imageId = ?");
    const row = stmt.get(imageId) as ImageRow | undefined;

    if (!row) return null;

    return this.toImageRecord(row);
  }

  async findAllImages(): Promise<ImageRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM images ORDER BY createdAt DESC");
    const rows = stmt.all() as ImageRow[];

    return rows.map((row) => this.toImageRecord(row));
  }

  async findImagesByDefinitionName(definitionName: string): Promise<ImageRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM images WHERE definitionName = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(definitionName) as ImageRow[];

    return rows.map((row) => this.toImageRecord(row));
  }

  async deleteImage(imageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM images WHERE imageId = ?");
    stmt.run(imageId);
  }

  async imageExists(imageId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM images WHERE imageId = ?");
    return stmt.get(imageId) !== undefined;
  }

  // ==================== Session ====================

  async saveSession(record: SessionRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (sessionId, containerId, imageId, title, createdAt, updatedAt)
      VALUES (@sessionId, @containerId, @imageId, @title, @createdAt, @updatedAt)
      ON CONFLICT(sessionId) DO UPDATE SET
        title = @title,
        updatedAt = @updatedAt
    `);

    stmt.run({
      sessionId: record.sessionId,
      containerId: record.containerId,
      imageId: record.imageId,
      title: record.title,
      createdAt: toISOString(record.createdAt),
      updatedAt: toISOString(record.updatedAt),
    });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE sessionId = ?");
    const row = stmt.get(sessionId) as SessionRow | undefined;

    if (!row) return null;

    return this.toSessionRecord(row);
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM sessions WHERE imageId = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(imageId) as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async findSessionsByContainerId(containerId: string): Promise<SessionRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM sessions WHERE containerId = ? ORDER BY updatedAt DESC"
    );
    const rows = stmt.all(containerId) as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM sessions ORDER BY updatedAt DESC");
    const rows = stmt.all() as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE sessionId = ?");
    stmt.run(sessionId);
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE imageId = ?");
    stmt.run(imageId);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM sessions WHERE sessionId = ?");
    return stmt.get(sessionId) !== undefined;
  }

  // ==================== Message ====================

  async saveMessage(record: MessageRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (messageId, sessionId, role, content, createdAt)
      VALUES (@messageId, @sessionId, @role, @content, @createdAt)
      ON CONFLICT(messageId) DO UPDATE SET
        role = @role,
        content = @content
    `);

    stmt.run({
      messageId: record.messageId,
      sessionId: record.sessionId,
      role: record.role,
      content: JSON.stringify(record.content),
      createdAt: toISOString(record.createdAt),
    });
  }

  async findMessageById(messageId: string): Promise<MessageRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM messages WHERE messageId = ?");
    const row = stmt.get(messageId) as MessageRow | undefined;

    if (!row) return null;

    return this.toMessageRecord(row);
  }

  async findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM messages WHERE sessionId = ? ORDER BY createdAt ASC"
    );
    const rows = stmt.all(sessionId) as MessageRow[];

    return rows.map((row) => this.toMessageRecord(row));
  }

  async deleteMessage(messageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM messages WHERE messageId = ?");
    stmt.run(messageId);
  }

  async deleteMessagesBySessionId(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM messages WHERE sessionId = ?");
    stmt.run(sessionId);
  }

  async countMessagesBySessionId(sessionId: string): Promise<number> {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM messages WHERE sessionId = ?");
    const row = stmt.get(sessionId) as { count: number };
    return row.count;
  }

  // ==================== Environment ====================

  async saveEnvironment(record: EnvironmentRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO environments (sessionId, environmentType, state, createdAt, updatedAt)
      VALUES (@sessionId, @environmentType, @state, @createdAt, @updatedAt)
      ON CONFLICT(sessionId) DO UPDATE SET
        environmentType = @environmentType,
        state = @state,
        updatedAt = @updatedAt
    `);

    stmt.run({
      sessionId: record.sessionId,
      environmentType: record.environmentType,
      state: JSON.stringify(record.state),
      createdAt: toISOString(record.createdAt),
      updatedAt: toISOString(record.updatedAt),
    });
  }

  async findEnvironmentBySessionId(sessionId: string): Promise<EnvironmentRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM environments WHERE sessionId = ?");
    const row = stmt.get(sessionId) as EnvironmentRow | undefined;

    if (!row) return null;

    return this.toEnvironmentRecord(row);
  }

  async findEnvironmentsByType(environmentType: string): Promise<EnvironmentRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM environments WHERE environmentType = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(environmentType) as EnvironmentRow[];

    return rows.map((row) => this.toEnvironmentRecord(row));
  }

  async deleteEnvironment(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM environments WHERE sessionId = ?");
    stmt.run(sessionId);
  }

  async environmentExists(sessionId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM environments WHERE sessionId = ?");
    return stmt.get(sessionId) !== undefined;
  }

  // ==================== Helpers ====================

  private toContainerRecord(row: ContainerRow): ContainerRecord {
    return {
      containerId: row.containerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      config: row.config ? JSON.parse(row.config) : undefined,
    };
  }

  private toImageRecord(row: ImageRow): ImageRecord {
    return {
      imageId: row.imageId,
      type: row.type as ImageRecord["type"],
      definitionName: row.definitionName,
      parentImageId: row.parentImageId,
      definition: JSON.parse(row.definition),
      config: JSON.parse(row.config),
      messages: JSON.parse(row.messages),
      createdAt: new Date(row.createdAt).getTime(),
    };
  }

  private toSessionRecord(row: SessionRow): SessionRecord {
    return {
      sessionId: row.sessionId,
      containerId: row.containerId,
      imageId: row.imageId,
      title: row.title,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
    };
  }

  private toMessageRecord(row: MessageRow): MessageRecord {
    return {
      messageId: row.messageId,
      sessionId: row.sessionId,
      role: row.role as MessageRole,
      content: JSON.parse(row.content),
      createdAt: new Date(row.createdAt).getTime(),
    };
  }

  private toEnvironmentRecord(row: EnvironmentRow): EnvironmentRecord {
    return {
      sessionId: row.sessionId,
      environmentType: row.environmentType,
      state: JSON.parse(row.state),
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Row types for SQLite results
interface ContainerRow {
  containerId: string;
  createdAt: number;
  updatedAt: number;
  config: string | null;
}

interface ImageRow {
  imageId: string;
  type: string;
  definitionName: string;
  parentImageId: string | null;
  definition: string;
  config: string;
  messages: string;
  createdAt: string;
}

interface SessionRow {
  sessionId: string;
  containerId: string;
  imageId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageRow {
  messageId: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

interface EnvironmentRow {
  sessionId: string;
  environmentType: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}
