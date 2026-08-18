import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Server-only password hashing (scrypt). Format: `scrypt:<salt>:<hex>`.
 * Demo seeds ship a fixed hash; production signups should generate a fresh
 * random salt per user.
 */

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const a = Buffer.from(hex, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
