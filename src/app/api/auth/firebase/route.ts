/**
 * POST /api/auth/firebase — federated login/ signup (Task 27).
 *
 * Body: { idToken: string } — a Firebase ID token minted client-side by the
 * Firebase JS SDK for one of: Google, GitHub, Facebook or Phone (SMS).
 *
 * The token is verified server-side exactly the way the Firebase Admin SDK
 * does it — RS256 signature against the securetoken public JWK for the
 * token's `kid` (Google's oauth2 tokeninfo endpoint REJECTS Firebase ID
 * tokens — Task 28 lesson), plus iss/aud/exp checks. On success the user
 * row is created/linked and the same signed `pb_session` cookie as
 * email+password login is issued.
 *
 * Account linking rules:
 *   1. existing row with this firebaseUid → refresh profile, sign in
 *   2. verified email matches an existing password account → link + sign in
 *      (unverified emails NEVER link — no account takeover)
 *   3. otherwise create the account (federated users have passwordHash: null;
 *      phone accounts get a synthesized `<digits>@phone.playbeat.digital`
 *      email so the unique-email contract keeps holding)
 *
 * 200 → { user } + Set-Cookie pb_session (httpOnly, lax, 30 days)
 * 401 → invalid/expired/wrong-project token
 * 409 → email belongs to a password account (log in with password instead)
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { serializeUser, sessionResponse } from '../_lib/session';

export const dynamic = 'force-dynamic';

/**
 * The Firebase project this app belongs to (from the web app config the user
 * provisioned: gen-lang-client-0800809003). Public knowledge — the web config
 * ships to every browser — but taken from env when present.
 */
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0800809003';

/** Public RS256 signing keys for Firebase ID tokens (rotate ~daily). */
const JWK_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWK_CACHE_MS = 6 * 60 * 60 * 1000;
let jwkCache: { keys: crypto.JsonWebKey[]; kidIndex: Map<string, crypto.JsonWebKey>; fetchedAt: number } | null =
  null;

const TOKEN_MAX_LEN = 4096;
const NAME_MAX = 60;

// Prisma unique-constraint violation code.
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/** Raw JWT payload claims (JSON — NOT the string-ified tokeninfo shape). */
interface FirebaseClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
  phone_number?: unknown;
  firebase?: { sign_in_provider?: unknown } | unknown;
}

/** Normalized identity extracted from a verified ID token. */
interface FirebaseIdentity {
  firebaseUid: string;
  provider: 'google' | 'github' | 'facebook' | 'phone' | 'password';
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  photoUrl: string | null;
  phone: string | null;
}

/** Map Firebase sign_in_provider values onto our provider column. */
function mapProvider(signInProvider: string): FirebaseIdentity['provider'] {
  switch (signInProvider) {
    case 'google.com':
      return 'google';
    case 'github.com':
      return 'github';
    case 'facebook.com':
      return 'facebook';
    case 'password':
      return 'password';
    default:
      return 'phone'; // unknown federated provider — treated as opaque uid
  }
}

/** Friendly display name for a phone number, e.g. +15551234567 → +1 555 123 4567 */
function formatPhone(phone: string): string {
  const m = /^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/.exec(phone);
  if (!m) return phone;
  return `+${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

/** Fetch + cache the securetoken public keys (kid → JWK). */
async function getFirebaseKeys(): Promise<{
  keys: crypto.JsonWebKey[];
  kidIndex: Map<string, crypto.JsonWebKey>;
}> {
  if (jwkCache && Date.now() - jwkCache.fetchedAt < JWK_CACHE_MS) {
    return jwkCache;
  }
  const res = await fetch(JWK_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Firebase signing keys');
  const data = (await res.json()) as { keys?: crypto.JsonWebKey[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  const kidIndex = new Map<string, crypto.JsonWebKey>();
  for (const key of keys) {
    if (typeof key.kid === 'string') kidIndex.set(key.kid, key);
  }
  jwkCache = { keys, kidIndex, fetchedAt: Date.now() };
  return jwkCache;
}

/**
 * Verify a Firebase ID token (RS256 + securetoken JWK + iss/aud/exp).
 * Returns the normalized identity, or null when the token fails any check.
 */
async function verifyIdToken(idToken: string): Promise<FirebaseIdentity | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const [headerSegment, payloadSegment, signatureSegment] = parts;

    const header = JSON.parse(
      Buffer.from(headerSegment, 'base64url').toString('utf8')
    ) as { alg?: unknown; kid?: unknown };
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;

    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8')
    ) as FirebaseClaims;

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      payload.aud !== FIREBASE_PROJECT_ID ||
      typeof payload.exp !== 'number' ||
      payload.exp <= nowSec ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      payload.sub.length > 128
    ) {
      return null;
    }

    const { kidIndex } = await getFirebaseKeys();
    const jwk = kidIndex.get(header.kid);
    if (!jwk) return null;

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerSegment}.${payloadSegment}`);
    const signatureOk = verifier.verify(
      publicKey,
      Buffer.from(signatureSegment, 'base64url')
    );
    if (!signatureOk) return null;

    const signInProvider =
      payload.firebase && typeof payload.firebase === 'object'
        ? String(
            (payload.firebase as { sign_in_provider?: unknown })
              .sign_in_provider ?? 'phone'
          )
        : 'phone';

    return {
      firebaseUid: payload.sub,
      provider: mapProvider(signInProvider),
      email:
        typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true,
      name:
        typeof payload.name === 'string' && payload.name.trim().length > 0
          ? payload.name.trim().slice(0, NAME_MAX)
          : null,
      photoUrl: typeof payload.picture === 'string' ? payload.picture : null,
      phone:
        typeof payload.phone_number === 'string' &&
        payload.phone_number.startsWith('+')
          ? payload.phone_number
          : null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const idToken =
    typeof (body as { idToken?: unknown })?.idToken === 'string'
      ? ((body as { idToken: string }).idToken).trim()
      : '';

  if (!idToken || idToken.length > TOKEN_MAX_LEN) {
    return NextResponse.json(
      { error: 'A Firebase ID token is required' },
      { status: 400 }
    );
  }

  const identity = await verifyIdToken(idToken);
  if (!identity) {
    return NextResponse.json(
      { error: 'That sign-in couldn\u2019t be verified — please try again.' },
      { status: 401 }
    );
  }

  try {
    // 1. Existing federated identity → refresh profile + sign in.
    const byUid = await db.user.findUnique({
      where: { firebaseUid: identity.firebaseUid },
    });
    if (byUid) {
      const user = await db.user.update({
        where: { id: byUid.id },
        data: {
          name: identity.name ?? byUid.name,
          photoUrl: identity.photoUrl ?? byUid.photoUrl,
          phone: identity.phone ?? byUid.phone,
        },
      });
      return sessionResponse(user, { user: serializeUser(user) });
    }

    // 2. Verified email matches a password account → link it (no takeover
    //    with unverified emails).
    if (identity.email && identity.emailVerified) {
      const byEmail = await db.user.findUnique({
        where: { email: identity.email },
      });
      if (byEmail) {
        const user = await db.user.update({
          where: { id: byEmail.id },
          data: {
            firebaseUid: identity.firebaseUid,
            provider: identity.provider,
            photoUrl: identity.photoUrl ?? byEmail.photoUrl,
            phone: identity.phone ?? byEmail.phone,
          },
        });
        return sessionResponse(user, { user: serializeUser(user) });
      }
    }

    // 3. Brand-new federated account. Phone identities have no email —
    //    synthesize one so the unique NOT NULL email contract holds.
    const digits = (identity.phone ?? identity.firebaseUid).replace(
      /\D/g,
      ''
    );
    const email =
      identity.email ?? `${digits.slice(0, 24)}@phone.playbeat.digital`;
    const name =
      identity.name ??
      (identity.phone
        ? formatPhone(identity.phone)
        : email.split('@')[0].slice(0, NAME_MAX));

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: null,
        firebaseUid: identity.firebaseUid,
        provider: identity.provider,
        photoUrl: identity.photoUrl,
        phone: identity.phone,
      },
    });

    return sessionResponse(user, { user: serializeUser(user) }, 201);
  } catch (error) {
    // Unique race (two tabs signing in at once) — re-read and sign in.
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
    ) {
      const user = await db.user.findUnique({
        where: { firebaseUid: identity.firebaseUid },
      });
      if (user) {
        return sessionResponse(user, { user: serializeUser(user) });
      }
    }
    return NextResponse.json(
      { error: 'Failed to finish Firebase sign-in' },
      { status: 500 }
    );
  }
}
