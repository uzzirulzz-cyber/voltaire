/**
 * /api/conversations/[id] — single session fetch & delete.
 *
 * Port of the original Express routes: ownership is enforced by matching the
 * signed-in user's uid (from the pb_session cookie) against the
 * conversation's `uid` (404 on mismatch so ids can't be probed).
 * DELETE cascades to the conversation's messages.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeConversation } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to keep your sessions.' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const conversation = await db.conversation.findUnique({ where: { id } });

    if (!conversation || conversation.uid !== user.uid) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: serializeConversation(conversation),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to keep your sessions.' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const conversation = await db.conversation.findUnique({ where: { id } });

    if (!conversation || conversation.uid !== user.uid) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await db.conversation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
