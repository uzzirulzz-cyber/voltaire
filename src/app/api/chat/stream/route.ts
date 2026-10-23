/**
 * POST /api/chat/stream — SSE streaming chat for the home-page embed.
 *
 * The live-preview endpoint: replies stream token-by-token so the preview
 * visibly builds up. Open to guests (ephemeral, nothing persisted) and to
 * signed-in users (full persistence like /api/chat).
 *
 * Body: { message: string, conversationId?: string, model?: string }
 * Response: text/event-stream
 *   data: {"t":"meta","conversationId":"..."}     (signed-in only)
 *   data: {"t":"delta","v":"..."}                 (many, in order)
 *   data: {"t":"done","chars":123}
 *   data: {"t":"error","v":"message"}
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { streamKimiPipeline } from '@/lib/kimi';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GUEST_MAX_MESSAGE_LENGTH = 2_000;
const USER_MAX_MESSAGE_LENGTH = 4_000;
const GUEST_MAX_TOKENS = 800;
const USER_MAX_TOKENS = 2_048;
const TITLE_SLICE = 42;
const HISTORY_WINDOW = 40;

export async function POST(request: NextRequest) {
  /* Optional identity — guests stream an ephemeral preview. */
  const user = await getSessionUser().catch(() => null);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = (body ?? {}) as {
    message?: unknown;
    conversationId?: unknown;
    model?: unknown;
  };

  const messageLimit = user ? USER_MAX_MESSAGE_LENGTH : GUEST_MAX_MESSAGE_LENGTH;
  const message =
    typeof parsed.message === 'string' ? parsed.message.trim() : '';
  if (message.length < 1 || message.length > messageLimit) {
    return Response.json(
      { error: `message is required and must be 1-${messageLimit} characters` },
      { status: 400 }
    );
  }

  const model =
    typeof parsed.model === 'string' && /^[a-zA-Z0-9.\/\-:]{1,64}$/.test(parsed.model)
      ? parsed.model
      : undefined;
  const conversationId =
    typeof parsed.conversationId === 'string' && parsed.conversationId.length > 0
      ? parsed.conversationId
      : undefined;

  /* Load/create the conversation BEFORE streaming so failures return as
   * proper HTTP status codes, not mid-stream errors. */
  let conversation: { id: string } | null = null;
  const history: Array<{ role: string; content: string }> = [];

  if (user) {
    try {
      if (conversationId) {
        const existing = await db.conversation.findUnique({
          where: { id: conversationId },
        });
        if (!existing || existing.uid !== user.uid) {
          return Response.json(
            { error: 'Conversation not found' },
            { status: 404 }
          );
        }
        conversation = existing;
      } else {
        conversation = await db.conversation.create({
          data: {
            uid: user.uid,
            title:
              message.slice(0, TITLE_SLICE) +
              (message.length > TITLE_SLICE ? '…' : ''),
            model: 'glm-4.6',
          },
        });
      }

      await db.message.create({
        data: { role: 'user', content: message, conversationId: conversation.id },
      });

      const recent = await db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_WINDOW,
      });
      history.push(
        ...recent
          .reverse()
          .map((entry) => ({ role: entry.role, content: entry.content }))
      );
    } catch {
      return Response.json(
        { error: 'Chat pipeline failed' },
        { status: 500 }
      );
    }
  } else {
    history.push({ role: 'user', content: message });
  }

  const encoder = new TextEncoder();
  const maxTokens = user ? USER_MAX_TOKENS : GUEST_MAX_TOKENS;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let reply = '';
      try {
        if (conversation) {
          send({ t: 'meta', conversationId: conversation.id });
        }

        for await (const delta of streamKimiPipeline(history, { model, maxTokens })) {
          reply += delta;
          send({ t: 'delta', v: delta });
        }

        if (!reply.trim()) {
          throw new Error('The pipeline returned an empty reply');
        }

        /* Persist the assistant reply for signed-in users. */
        if (conversation) {
          try {
            await db.message.create({
              data: {
                role: 'assistant',
                content: reply,
                model: 'glm-4.6',
                conversationId: conversation.id,
              },
            });
            await db.conversation.update({
              where: { id: conversation.id },
              data: { messageCount: { increment: 2 } },
            });
          } catch {
            /* preview already delivered — persistence failure is non-fatal */
          }
        }

        send({ t: 'done', chars: reply.length });
      } catch (error) {
        send({
          t: 'error',
          v:
            error instanceof Error
              ? error.message
              : 'The pipeline hit an unexpected error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
