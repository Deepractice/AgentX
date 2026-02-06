import { getDatabase } from "./index";
import { generateId } from "commonxjs/id";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: string;
}

export interface InviteCode {
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

// ============================================================================
// System Config Repository
// ============================================================================

export const SystemConfigRepository = {
  isInitialized(): boolean {
    const db = getDatabase();
    const stmt = db.prepare("SELECT value FROM system_config WHERE key = ?");
    const row = stmt.get("initialized") as { value: string } | undefined;
    return row?.value === "true";
  },

  setInitialized(): void {
    const db = getDatabase();
    const stmt = db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)");
    stmt.run("initialized", "true");
  },

  get(key: string): string | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT value FROM system_config WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  set(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)");
    stmt.run(key, value);
  },
};

// ============================================================================
// User Repository
// ============================================================================

export const UserRepository = {
  create(email: string, passwordHash: string, role: "admin" | "user"): User {
    const db = getDatabase();
    const id = generateId("user");
    const stmt = db.prepare(
      "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    stmt.run(id, email, passwordHash, role);
    return this.findById(id)!;
  },

  findById(id: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as User | undefined;
    return row ?? null;
  },

  findByEmail(email: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as User | undefined;
    return row ?? null;
  },

  count(): number {
    const db = getDatabase();
    const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
    const row = stmt.get() as { count: number };
    return row.count;
  },
};

// ============================================================================
// Invite Code Repository
// ============================================================================

export const InviteCodeRepository = {
  create(createdBy: string): InviteCode {
    const db = getDatabase();
    const code = generateInviteCode();
    const stmt = db.prepare("INSERT INTO invite_codes (code, created_by) VALUES (?, ?)");
    stmt.run(code, createdBy);
    return this.findByCode(code)!;
  },

  findByCode(code: string): InviteCode | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM invite_codes WHERE code = ?");
    const row = stmt.get(code) as InviteCode | undefined;
    return row ?? null;
  },

  findValid(code: string): InviteCode | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM invite_codes WHERE code = ? AND used_by IS NULL");
    const row = stmt.get(code) as InviteCode | undefined;
    return row ?? null;
  },

  markUsed(code: string, userId: string): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE invite_codes SET used_by = ?, used_at = datetime('now') WHERE code = ?"
    );
    stmt.run(userId, code);
  },

  listAll(): InviteCode[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM invite_codes ORDER BY created_at DESC");
    return stmt.all() as InviteCode[];
  },

  listByCreator(createdBy: string): InviteCode[] {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM invite_codes WHERE created_by = ? ORDER BY created_at DESC"
    );
    return stmt.all(createdBy) as InviteCode[];
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateInviteCode(): string {
  // Generate a random 8-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: 0, O, 1, I
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
