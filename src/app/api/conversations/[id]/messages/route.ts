/**
 * GET /api/conversations/[id]/messages — message history for a session.
 *
 * Port of the original Express route: verifies the caller owns the
 * conversation, then streams back up to 200 messages, oldest first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeMessage } from '../../../_lib/serialize';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const uid = request.nextUrl.searchParams.get('uid')?.trim();

  try {
    const conversation = await db.conversation.findUnique({ where: { id } });

    if (!conversation || !uid || conversation.uid !== uid) {
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
