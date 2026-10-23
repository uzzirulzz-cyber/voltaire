/**
 * POST /api/chat — the pipeline endpoint.
 *
 * Port of the original Express /api/chat: the full node graph in one request.
 *
 *   Prompt node    → persist the user's message (1..4000 chars after trim)
 *   Router node    → rebuild the prompt window from the trailing history
 *                    (last 40 messages, chronological order)
 *   KIMI Core node → runKimiPipeline() via z-ai-web-dev-sdk (server-only)
 *   Deliver node   → persist the assistant reply, bump messageCount,
 *                    return the refreshed conversation
 *
 * Body: { uid: string (required), conversationId?: string, message: string }
 * When conversationId is omitted a new session is created whose title is
 * derived from the first message (42 chars + ellipsis), like the original.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KIMI_MODEL, runKimiPipeline } from '@/lib/kimi';
import { serializeConversation, serializeMessage } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LENGTH = 4_000;
const TITLE_SLICE = 42;
const HISTORY_WINDOW = 40;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as {
    uid?: unknown;
    conversationId?: unknown;
    message?: unknown;
  };

  const uid = typeof parsed.uid === 'string' ? parsed.uid.trim() : '';
  if (!uid) {
    return NextResponse.json({ error: 'uid is required' }, { status: 400 });
  }

  const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
  if (message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `message is required and must be 1-${MAX_MESSAGE_LENGTH} characters`,
      },
      { status: 400 }
    );
  }

  const conversationId =
    typeof parsed.conversationId === 'string' && parsed.conversationId.length > 0
      ? parsed.conversationId
      : undefined;

  try {
    // ── Load or create the conversation ────────────────────────────────────
    let conversation = conversationId
      ? await db.conversation.findUnique({ where: { id: conversationId } })
      : null;

    if (conversationId) {
      if (!conversation || conversation.uid !== uid) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      conversation = await db.conversation.create({
        data: {
          uid,
          title:
            message.slice(0, TITLE_SLICE) +
            (message.length > TITLE_SLICE ? '…' : ''),
          model: KIMI_MODEL,
        },
      });
    }

    // ── Prompt node: append the user message ───────────────────────────────
    await db.message.create({
      data: { role: 'user', content: message, conversationId: conversation.id },
    });

    // ── Router node: trailing history window, chronological ────────────────
    const recent = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
    });
    const history = recent
      .reverse()
      .map((entry) => ({ role: entry.role, content: entry.content }));

    // ── KIMI Core node ──────────────────────────────────────────────────────
    let replyContent: string;
    try {
      const result = await runKimiPipeline(history);
      replyContent = result.content;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'KIMI pipeline failed',
        },
        { status: 502 }
      );
    }

    // ── Deliver node: persist the assistant reply ──────────────────────────
    const reply = await db.message.create({
      data: {
        role: 'assistant',
        content: replyContent,
        model: KIMI_MODEL,
        conversationId: conversation.id,
      },
    });

    // messageCount bump touches the row so @updatedAt refreshes.
    const updated = await db.conversation.update({
      where: { id: conversation.id },
      data: { messageCount: { increment: 2 } },
    });

    return NextResponse.json({
      conversationId: updated.id,
      conversation: serializeConversation(updated),
      reply: serializeMessage(reply),
    });
  } catch {
    return NextResponse.json(
      { error: 'Chat pipeline failed' },
      { status: 500 }
    );
  }
}
