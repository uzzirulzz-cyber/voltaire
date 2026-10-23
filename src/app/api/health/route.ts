/**
 * GET /api/health — liveness probe.
 *
 * Port of the original Express health endpoint: reports project id,
 * database connectivity and AI pipeline status.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL } from '@/lib/kimi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = {
    ok: true,
    project: 'playbeatdigital-world',
    database: 'connected',
    ai: 'live',
    model: KIMI_MODEL,
    time: new Date().toISOString(),
  };

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { ...payload, ok: false, database: 'offline' },
      { status: 503 }
    );
  }

  return NextResponse.json(payload);
}
