/**
 * Shared helpers for /api/auth/* routes (private `_lib`, not routed).
 */
import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
} from '@/lib/auth';

/** Public user JSON contract — never exposes passwordHash. */
export interface UserJSON {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO
}

export function serializeUser(user: User): UserJSON {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

/** JSON response that also sets the pb_session cookie. */
export function sessionResponse(
  user: Pick<User, 'id' | 'email' | 'name'>,
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  const token = signSessionToken(user);
  const res = NextResponse.json(body, { status });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
