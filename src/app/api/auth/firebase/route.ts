/**
 * POST /api/auth/firebase — federated login/ signup (Task 27).
 *
 * Body: { idToken: string } — a Firebase ID token minted client-side by the
 * Firebase JS SDK for one of: Google, GitHub, Facebook or Phone (SMS).
 *
 * The token is verified server-side against Google's public tokeninfo
 * endpoint (no Firebase Admin service-account needed): aud must equal this
 * Firebase project id, the issuer must be Google/securetoken, and the token
 * must be unexpired. On success the user row is created/linked and the same
 * signed `pb_session` cookie as email+password login is issued.
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

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
const TOKEN_MAX_LEN = 4096;
const NAME_MAX = 60;

// Prisma unique-constraint violation code.
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/** Raw tokeninfo payload (string-valued claims — Google returns strings). */
interface TokenInfo {
  aud?: string;
  sub?: string;
  iss?: string;
  exp?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  phone_number?: string;
  /** Firebase claim, nested JSON as a STRING. */
  firebase?: string;
  [key: string]: unknown;
}

/** Normalized identity extracted from a verified ID token. */
interface FirebaseIdentity {
  firebaseUid: string;
  provider: 'google' | 'github' | 'facebook' | 'phone';
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
    case 'phone':
      return 'phone';
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

/**
 * Verify a Firebase ID token via Google's public tokeninfo endpoint.
 * Returns the normalized identity, or null when the token fails any check.
 */
async function verifyIdToken(idToken: string): Promise<FirebaseIdentity | null> {
  let info: TokenInfo;
  try {
    const res = await fetch(TOKENINFO_URL + encodeURIComponent(idToken), {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return null; // 400 = invalid token
    info = (await res.json()) as TokenInfo;
  } catch {
    return null; // network / timeout
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = Number(info.exp);

  if (
    info.aud !== FIREBASE_PROJECT_ID || // token for a different project
    !Number.isFinite(exp) ||
    exp <= nowSec || // expired
    !info.sub || // no subject
    (info.iss !== 'https://accounts.google.com' &&
      info.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` &&
      info.iss !== 'accounts.google.com')
  ) {
    return null;
  }

  // sign_in_provider lives in the nested `firebase` claim (a JSON string).
  let signInProvider = 'phone';
  if (typeof info.firebase === 'string') {
    try {
      const fb = JSON.parse(info.firebase) as { sign_in_provider?: string };
      if (typeof fb.sign_in_provider === 'string') {
        signInProvider = fb.sign_in_provider;
      }
    } catch {
      /* keep default */
    }
  }

  const email = typeof info.email === 'string' ? info.email.toLowerCase() : null;

  return {
    firebaseUid: info.sub,
    provider: mapProvider(signInProvider),
    email,
    emailVerified: info.email_verified === 'true',
    name:
      typeof info.name === 'string' && info.name.trim().length > 0
        ? info.name.trim().slice(0, NAME_MAX)
        : null,
    photoUrl: typeof info.picture === 'string' ? info.picture : null,
    phone:
      typeof info.phone_number === 'string' && info.phone_number.startsWith('+')
        ? info.phone_number
        : null,
  };
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
