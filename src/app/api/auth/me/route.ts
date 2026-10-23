/**
 * GET /api/auth/me — who am I?
 *
 * 200 { user: { id, name, email, createdAt } } when a valid session exists
 * AND the backing user row still exists; 401 otherwise.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeUser } from '../_lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: 'Not signed in' },
        { status: 401 }
      );
    }

    // Fresh row — a token can outlive its user.
    const user = await db.user.findUnique({ where: { id: session.uid } });
    if (!user) {
      return NextResponse.json(
        { error: 'Not signed in' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: serializeUser(user) });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load session' },
      { status: 500 }
    );
  }
}
