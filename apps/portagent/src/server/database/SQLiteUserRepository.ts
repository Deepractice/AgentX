/**
 * SQLiteUserRepository - SQLite implementation of UserRepository
 *
 * Manages user data in separate portagent.db database.
 * This is independent from AgentX's agentx.db.
 *
 * Relationship to AgentX:
 * - User (portagent.db) ←→ Container.config.ownerId (agentx.db)
 * - User.userId is stored in Container.config.ownerId field
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";
import type { UserRepository } from "../user/UserRepository";
import type { UserRecord, RegisterUserInput } from "../user/types";

/**
 * SQLite implementation of UserRepository
 */
export class SQLiteUserRepository implements UserRepository {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  /**
   * Initialize database schema
   */
  private initDatabase(): void {
    // Enable foreign keys
    this.db.run("PRAGMA foreign_keys = ON");

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        containerId TEXT NOT NULL,
        displayName TEXT,
        avatar TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_containerId ON users(containerId);
    `);
  }

  /**
   * Create a new user
   */
  async createUser(input: RegisterUserInput): Promise<UserRecord> {
    // Check if username exists
    if (await this.usernameExists(input.username)) {
      throw new Error(`Username '${input.username}' already exists`);
    }

    // Check if email exists (only if provided)
    if (input.email && (await this.emailExists(input.email))) {
      throw new Error(`Email '${input.email}' already exists`);
    }

    // Hash password using Bun's built-in password API (bcrypt algorithm)
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Create user record
    const userId = randomUUID();
    const now = Date.now();

    // Use placeholder email if not provided (to satisfy DB constraint)
    const email = input.email || `${userId}@noemail.portagent`;

    const user: UserRecord = {
      userId,
      username: input.username,
      email,
      passwordHash,
      containerId: input.containerId,
      displayName: input.displayName,
      avatar: input.avatar,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO users (
        userId, username, email, passwordHash, containerId, displayName, avatar, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      user.userId,
      user.username,
      user.email,
      user.passwordHash,
      user.containerId,
      user.displayName,
      user.avatar,
      user.isActive ? 1 : 0,
      user.createdAt,
      user.updatedAt
    );

    return user;
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<UserRecord | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE userId = ?
    `);

    const row = stmt.get(userId) as any;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Find user by username
   */
  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE username = ?
    `);

    const row = stmt.get(username) as any;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `);

    const row = stmt.get(email) as any;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Find user by username or email
   */
  async findUserByUsernameOrEmail(usernameOrEmail: string): Promise<UserRecord | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE username = ? OR email = ?
    `);

    const row = stmt.get(usernameOrEmail, usernameOrEmail) as any;
    return row ? this.rowToUser(row) : null;
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updates: Partial<Omit<UserRecord, "userId">>
  ): Promise<UserRecord> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Build SET clause dynamically
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.username !== undefined) {
      fields.push("username = ?");
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      values.push(updates.email);
    }
    if (updates.passwordHash !== undefined) {
      fields.push("passwordHash = ?");
      values.push(updates.passwordHash);
    }
    if (updates.displayName !== undefined) {
      fields.push("displayName = ?");
      values.push(updates.displayName);
    }
    if (updates.avatar !== undefined) {
      fields.push("avatar = ?");
      values.push(updates.avatar);
    }
    if (updates.isActive !== undefined) {
      fields.push("isActive = ?");
      values.push(updates.isActive ? 1 : 0);
    }

    // Always update updatedAt
    fields.push("updatedAt = ?");
    values.push(Date.now());

    if (fields.length === 0) {
      return user; // No updates
    }

    // Execute update
    values.push(userId);
    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(", ")} WHERE userId = ?
    `);

    stmt.run(...values);

    // Return updated user
    return (await this.findUserById(userId))!;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM users WHERE userId = ?
    `);

    const result = stmt.run(userId);
    return result.changes > 0;
  }

  /**
   * List all users
   */
  async listUsers(): Promise<UserRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM users ORDER BY createdAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => this.rowToUser(row));
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM users WHERE username = ?
    `);

    return stmt.get(username) !== null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM users WHERE email = ?
    `);

    return stmt.get(email) !== null;
  }

  /**
   * Verify password for login
   *
   * @param usernameOrEmail - Username or email
   * @param password - Plain text password
   * @returns User record if valid, null if invalid
   */
  async verifyPassword(usernameOrEmail: string, password: string): Promise<UserRecord | null> {
    const user = await this.findUserByUsernameOrEmail(usernameOrEmail);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      return null; // Inactive user
    }

    const isValid = await Bun.password.verify(password, user.passwordHash);
    return isValid ? user : null;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private rowToUser(row: any): UserRecord {
    return {
      userId: row.userId,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      containerId: row.containerId,
      displayName: row.displayName,
      avatar: row.avatar,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
