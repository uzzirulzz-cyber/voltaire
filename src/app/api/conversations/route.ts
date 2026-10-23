/**
 * /api/conversations — session list & creation.
 *
 * Port of the original Express routes (Firestore `conversations` collection):
 * - GET  → latest 50 conversations for the signed-in user, updatedAt desc
 * - POST { title? } → create a new session (model pinned to KIMI)
 *
 * Task 8: the client-generated `uid` was replaced by the signed pb_session
 * cookie; Conversation.uid now stores the session user's uid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL } from '@/lib/kimi';
import { getSessionUser } from '@/lib/auth';
import { serializeConversation } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to keep your sessions.' },
      { status: 401 }
    );
  }

  try {
    const conversations = await db.conversation.findMany({
      where: { uid: user.uid },
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
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to keep your sessions.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as { title?: unknown };

  const title =
    typeof parsed.title === 'string' && parsed.title.trim().length > 0
      ? parsed.title.slice(0, 80)
      : 'New session';

  try {
    const conversation = await db.conversation.create({
      data: { uid: user.uid, title, model: KIMI_MODEL },
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
