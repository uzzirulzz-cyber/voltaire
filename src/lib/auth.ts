/**
 * PlayBeat AI — session auth (server-only).
 *
 * Real email+password accounts replace the old client-generated `uid`.
 * Passwords are hashed with scrypt ("salt:hash" hex); sessions are signed
 * stateless tokens stored in the httpOnly `pb_session` cookie:
 *
 *   token = base64url(JSON payload) + "." + HMAC-SHA256-hex(payload)
 *
 * The payload carries the user's uid, which stays the Conversation.uid owner
 * key — the storage/ownership pattern is unchanged, only the credential
 * source moved from localStorage to a signed cookie.
 *
 * IMPORTANT: never import this from client code (crypto + next/headers) —
 * API routes only.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/** Cookie that carries the signed session token. */
export const SESSION_COOKIE = 'pb_session';

/** 30 days, in seconds (maxAge for the cookie and the token's exp). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Signing secret. The stable dev fallback keeps cookies valid across dev
 * server restarts so sessions don't die on every hot-reload/HMR cycle;
 * production must set AUTH_SECRET.
 */
const AUTH_SECRET =
  process.env.AUTH_SECRET || 'playbeat-dev-secret-0800809003';

/** scrypt parameters. */
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** Session payload embedded in the token. */
export interface SessionPayload {
  uid: string;
  email: string;
  name: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
}

/** Hash a password: `${salt-hex}:${scrypt-hash-hex}`. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_BYTES).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored "salt:hash" value.
 * The salt segment is passed to scryptSync as the SAME hex string used at
 * hash time (scrypt treats string salts as UTF-8 bytes — decoding the hex
 * first would derive from different salt bytes and never match).
 * Returns false on any malformed input (including null — federated accounts
 * have no password) — never throws.
 */
export function verifyPassword(
  password: string,
  stored: string | null
): boolean {
  try {
    const separator = stored.indexOf(':');
    if (separator <= 0) return false;

    const salt = stored.slice(0, separator);
    const expected = stored.slice(separator + 1);
    if (!salt || !expected) return false;

    const expectedBuffer = Buffer.from(expected, 'hex');
    if (expectedBuffer.length === 0) return false;

    const actual = crypto.scryptSync(password, salt, expectedBuffer.length);
    return crypto.timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

/** base64url encode (no padding) of a UTF-8 string. */
function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/** base64url decode to a UTF-8 string (returns null on malformed input). */
function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

/** HMAC-SHA256 hex signature of the payload segment. */
function sign(payloadSegment: string): string {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadSegment)
    .digest('hex');
}

/** Issue a signed session token for a user (exp = now + 30 days). */
export function signSessionToken(user: {
  id: string;
  email: string;
  name: string;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.id,
    email: user.email,
    name: user.name,
    iat,
    exp: iat + SESSION_MAX_AGE,
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  return `${payloadSegment}.${sign(payloadSegment)}`;
}

/**
 * Read + verify the session cookie.
 * Returns the payload, or null when absent, malformed, badly signed or
 * expired. Never throws.
 */
export async function getSessionUser(): Promise<{
  uid: string;
  email: string;
  name: string;
} | null> {
  try {
    const jar = await cookies(); // Next 16: cookies() is async
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;

    const payloadSegment = token.slice(0, dot);
    const signature = token.slice(dot + 1);
    if (!payloadSegment || !signature) return null;

    const expectedSignature = sign(payloadSegment);
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const decoded = base64UrlDecode(payloadSegment);
    if (!decoded) return null;

    let payload: SessionPayload;
    try {
      payload = JSON.parse(decoded) as SessionPayload;
    } catch {
      return null;
    }

    if (
      typeof payload.uid !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { uid: payload.uid, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
