/**
 * POST /api/auth/signup — create an account.
 *
 * Body: { name?: string, email: string, password: string }
 * - email is lowercased + trimmed and must look like an address
 * - password: 8..72 chars
 * - name: optional, trimmed, sliced to 60; defaults to the email local-part
 *
 * 201 → { user } + Set-Cookie pb_session (httpOnly, lax, 30 days)
 * 409 → email already registered
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { serializeUser, sessionResponse } from '../_lib/session';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const NAME_MAX = 60;

// Prisma unique-constraint violation code.
const PRISMA_UNIQUE_VIOLATION = 'P2002';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };

  const email =
    typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: 'A valid email is required' },
      { status: 400 }
    );
  }

  const password =
    typeof parsed.password === 'string' ? parsed.password : '';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json(
      {
        error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`,
      },
      { status: 400 }
    );
  }

  const name =
    typeof parsed.name === 'string' && parsed.name.trim().length > 0
      ? parsed.name.trim().slice(0, NAME_MAX)
      : email.split('@')[0].slice(0, NAME_MAX);

  try {
    const user = await db.user.create({
      data: { email, name, passwordHash: hashPassword(password) },
    });

    return sessionResponse(
      user,
      { user: serializeUser(user) },
      201
    );
  } catch (error) {
    // Unique violation → friendly "already registered" instead of a 500.
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
    ) {
      return NextResponse.json(
        { error: 'That email already has an account — log in instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
