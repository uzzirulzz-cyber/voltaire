/**
 * GET /api/conversations/[id]/messages — message history for a session.
 *
 * Port of the original Express route: verifies the signed-in user owns the
 * conversation (pb_session uid vs Conversation.uid), then returns up to
 * 200 messages, oldest first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeMessage } from '../../../_lib/serialize';

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

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return NextResponse.json({ messages: messages.map(serializeMessage) });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}
