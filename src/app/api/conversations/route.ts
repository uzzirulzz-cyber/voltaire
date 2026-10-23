/**
 * /api/conversations — session list & creation.
 *
 * Port of the original Express routes (Firestore `conversations` collection):
 * - GET  ?uid=...  → latest 50 conversations for the user, updatedAt desc
 * - POST { uid, title? } → create a new session (model pinned to KIMI)
 *
 * Firebase ID tokens were replaced by a client-generated `uid` that owns
 * its conversations — mirroring the original Firestore ownership pattern.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL } from '@/lib/kimi';
import { serializeConversation } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid')?.trim();
  if (!uid) {
    return NextResponse.json({ error: 'uid is required' }, { status: 400 });
  }

  try {
    const conversations = await db.conversation.findMany({
      where: { uid },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      conversations: conversations.map(serializeConversation),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as { uid?: unknown; title?: unknown };

  const uid = typeof parsed.uid === 'string' ? parsed.uid.trim() : '';
  if (!uid) {
    return NextResponse.json({ error: 'uid is required' }, { status: 400 });
  }

  const title =
    typeof parsed.title === 'string' && parsed.title.trim().length > 0
      ? parsed.title.slice(0, 80)
      : 'New session';

  try {
    const conversation = await db.conversation.create({
      data: { uid, title, model: KIMI_MODEL },
    });

    return NextResponse.json(
      { conversation: serializeConversation(conversation) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
