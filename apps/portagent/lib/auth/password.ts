/**
 * Password hashing utilities using Web Crypto API (crypto.subtle)
 */

const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password using PBKDF2 with SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  // Return as base64 encoded string: salt:hash
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

  return `${saltBase64}:${hashBase64}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltBase64, hashBase64] = storedHash.split(":");

  if (!saltBase64 || !hashBase64) {
    return false;
  }

  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(hashBase64), (c) => c.charCodeAt(0));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const actualHash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  // Constant-time comparison
  const actualHashArray = new Uint8Array(actualHash);
  if (actualHashArray.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < actualHashArray.length; i++) {
    result |= actualHashArray[i] ^ expectedHash[i];
  }

  return result === 0;
}
