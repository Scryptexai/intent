/**
 * Edge-safe signed session tokens (HMAC-SHA256 via Web Crypto) so the
 * middleware can verify sessions without Node-only APIs.
 * Cookie: `cif_session=<payload>.<sig>`; HttpOnly set by the login route.
 */

export interface SessionPayload {
  uid: string;
  email: string;
  role: "viewer" | "analyst" | "admin";
  plan: import("@/lib/domain").Plan;
  exp: number; // epoch seconds
}

const SECRET = process.env.SESSION_SECRET || "cif-dev-session-secret-change-in-prod";
const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let s = "";
  u8.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): ArrayBuffer {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const u = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
}
/** Always hand WebCrypto a fresh ArrayBuffer (TS strict BufferSource). */
function ab(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", ab(enc.encode(SECRET)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = b64url(ab(enc.encode(JSON.stringify(payload))));
  const sig = await crypto.subtle.sign("HMAC", await key(), ab(enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | null | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), ab(enc.encode(body)));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (!payload?.uid || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "cif_session";
export const SESSION_DAYS = 7;
