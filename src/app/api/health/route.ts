/**
 * GET /api/health — liveness probe.
 *
 * Port of the original Express health endpoint: reports project id,
 * database connectivity and AI pipeline status.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL, hasZaiDirect, hasGemini } from '@/lib/kimi';

export const dynamic = 'force-dynamic';

export async function GET() {
  /* Honest AI status: a provider is configured when HF_TOKEN, Gemini, or
   * the env-based Z.AI direct gateway is present. */
  const aiConfigured = hasGemini() || hasZaiDirect() || Boolean(process.env.HF_TOKEN);

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
  } catch (error) {
    /* Diagnostics expose exactly why the SQLite seed failed on an
     * instance (missing file / bad mode / upstream error). */
    let diagnostic = 'unknown';
    try {
      const fs = await import('node:fs');
      const target = (process.env.DATABASE_URL || '').replace(/^file:/, '');
      const stat = fs.existsSync(target)
        ? `exists(${fs.statSync(target).size}b, mode ${fs.statSync(target).mode})`
        : 'missing';
      diagnostic = `${target}: ${stat}; ${error instanceof Error ? error.message.slice(0, 140) : 'query failed'}`;
    } catch {
      /* keep 'unknown' */
    }
    return NextResponse.json(
      { ...payload, ok: false, database: 'offline', dbDiagnostic: diagnostic },
      { status: 503 }
    );
  }

  return NextResponse.json(payload);
}
