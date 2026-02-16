/**
 * JWT session management using jose library
 */

import { type JWTPayload, jwtVerify, SignJWT } from "jose";

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
}

// Get secret key from environment or generate a random one for development
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "development-secret-key-change-me";
  return new TextEncoder().encode(secret);
}

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Create a signed JWT token for a user session
 */
export async function createSession(payload: {
  userId: string;
  email: string;
  role: "admin" | "user";
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecretKey());

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_NAME = "session";

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  };
}
