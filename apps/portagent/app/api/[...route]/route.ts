import { Hono, type Context, type Next } from "hono";
import { handle } from "hono/vercel";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  type SessionPayload,
} from "@/lib/auth";
import {
  SystemConfigRepository,
  UserRepository,
  InviteCodeRepository,
} from "@/lib/db/repositories";

// ============================================================================
// Types
// ============================================================================

type Env = {
  Variables: {
    user: SessionPayload | null;
  };
};

// ============================================================================
// App Setup
// ============================================================================

const app = new Hono<Env>().basePath("/api");

// ============================================================================
// Middleware
// ============================================================================

// Auth middleware - extracts user from session cookie
app.use("*", async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (token) {
    const session = await verifySession(token);
    c.set("user", session);
  } else {
    c.set("user", null);
  }
  await next();
});

// Admin-only middleware
const requireAdmin = async (c: Context<Env>, next: Next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ error: "Access denied" }, 403);
  }
  await next();
};

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", (c) => {
  return c.json({ ok: true });
});

// ============================================================================
// System Status
// ============================================================================

app.get("/auth/status", (c) => {
  const initialized = SystemConfigRepository.isInitialized();
  const user = c.get("user");
  return c.json({
    initialized,
    authenticated: !!user,
    user: user
      ? {
          id: user.userId,
          email: user.email,
          role: user.role,
        }
      : null,
  });
});

// ============================================================================
// Auth: Setup (First Run)
// ============================================================================

app.post("/auth/setup", async (c) => {
  // Check if already initialized
  if (SystemConfigRepository.isInitialized()) {
    return c.json({ error: "System already initialized" }, 400);
  }

  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  // Create admin account
  const passwordHash = await hashPassword(password);
  const user = UserRepository.create(email, passwordHash, "admin");

  // Mark system as initialized
  SystemConfigRepository.setInitialized();

  // Create session
  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Set cookie
  const cookieOptions = getSessionCookieOptions();
  setCookie(c, SESSION_COOKIE_NAME, token, cookieOptions);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// ============================================================================
// Auth: Login
// ============================================================================

app.post("/auth/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  // Find user
  const user = UserRepository.findByEmail(email);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Create session
  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Set cookie
  const cookieOptions = getSessionCookieOptions();
  setCookie(c, SESSION_COOKIE_NAME, token, cookieOptions);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// ============================================================================
// Auth: Signup (with Invite Code)
// ============================================================================

app.post("/auth/signup", async (c) => {
  // Check if system is initialized
  if (!SystemConfigRepository.isInitialized()) {
    return c.json({ error: "System not initialized" }, 400);
  }

  const body = await c.req.json<{
    email: string;
    password: string;
    inviteCode: string;
  }>();
  const { email, password, inviteCode } = body;

  // Validate input
  if (!email || !password || !inviteCode) {
    return c.json({ error: "Email, password, and invite code are required" }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  // Verify invite code
  const invite = InviteCodeRepository.findValid(inviteCode);
  if (!invite) {
    return c.json({ error: "Invalid or used invite code" }, 400);
  }

  // Check if email already exists
  const existingUser = UserRepository.findByEmail(email);
  if (existingUser) {
    return c.json({ error: "Email already registered" }, 400);
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const user = UserRepository.create(email, passwordHash, "user");

  // Mark invite code as used
  InviteCodeRepository.markUsed(inviteCode, user.id);

  // Create session
  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Set cookie
  const cookieOptions = getSessionCookieOptions();
  setCookie(c, SESSION_COOKIE_NAME, token, cookieOptions);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// ============================================================================
// Auth: Logout
// ============================================================================

app.post("/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ success: true });
});

// ============================================================================
// Auth: Get Current User
// ============================================================================

app.get("/auth/me", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  return c.json({
    id: user.userId,
    email: user.email,
    role: user.role,
  });
});

// ============================================================================
// Admin: Invite Codes
// ============================================================================

app.post("/admin/invites", requireAdmin, (c) => {
  const user = c.get("user")!;
  const invite = InviteCodeRepository.create(user.userId);

  return c.json({
    code: invite.code,
    created_at: invite.created_at,
  });
});

app.get("/admin/invites", requireAdmin, (c) => {
  const invites = InviteCodeRepository.listAll();

  return c.json({
    invites: invites.map((invite) => ({
      code: invite.code,
      created_by: invite.created_by,
      used_by: invite.used_by,
      used_at: invite.used_at,
      created_at: invite.created_at,
    })),
  });
});

// ============================================================================
// Chat: WebSocket Config
// ============================================================================

app.get("/chat/ws-config", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const wsPort = process.env.WS_PORT || "5200";
  // In production, the WS URL should be configurable
  // For now, use the same host with the WS port
  const wsUrl = `ws://localhost:${wsPort}/ws`;

  return c.json({
    wsUrl,
    containerId: `user-${user.userId}`,
  });
});

// ============================================================================
// Export Handlers
// ============================================================================

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
