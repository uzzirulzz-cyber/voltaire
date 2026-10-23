/**
 * POST /api/auth/login — exchange credentials for a session cookie.
 *
 * Body: { email: string, password: string }
 * 200 → { user } + Set-Cookie pb_session
 * 401 → wrong email or password (same message for both — no probing)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { serializeUser, sessionResponse } from '../_lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as { email?: unknown; password?: unknown };

  const email =
    typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
  const password = typeof parsed.password === 'string' ? parsed.password : '';

  try {
    const user = email
      ? await db.user.findUnique({ where: { email } })
      : null;

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Wrong email or password.' },
        { status: 401 }
      );
    }

    return sessionResponse(user, { user: serializeUser(user) });
  } catch {
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    );
  }
}
