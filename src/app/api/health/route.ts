/**
 * GET /api/health — liveness probe.
 *
 * Port of the original Express health endpoint: reports project id,
 * database connectivity and AI pipeline status.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL, hasZaiDirect } from '@/lib/kimi';

export const dynamic = 'force-dynamic';

export async function GET() {
  /* Honest AI status: a provider is configured when HF_TOKEN or the
   * env-based Z.AI direct gateway is present. */
  const aiConfigured =
    hasZaiDirect() || Boolean(process.env.HF_TOKEN);

  const payload = {
    ok: true,
    project: 'playbeatdigital-world',
    database: 'connected',
    ai: aiConfigured ? 'live' : 'offline',
    auth: 'live',
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
