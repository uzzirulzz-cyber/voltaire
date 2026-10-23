/**
 * /api/conversations/[id] — single session fetch & delete.
 *
 * Port of the original Express routes: ownership is enforced by matching the
 * caller's `uid` against the conversation's `uid` (404 on mismatch so ids
 * can't be probed). DELETE cascades to the conversation's messages.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeConversation } from '../../_lib/serialize';

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

    await db.conversation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
