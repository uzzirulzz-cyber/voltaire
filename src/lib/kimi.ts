/**
 * KIMI pipeline — server-only helper for PlayBeat AI (playbeatdigital.world).
 *
 * Ports the original Express `runPipeline()` from the Firebase/Firestack stack
 * onto z-ai-web-dev-sdk. The persona rides along as the first message and the
 * last 40 conversation turns are replayed through the node graph:
 * Prompt → Router → KIMI Core → Deliver.
 *
 * IMPORTANT: this module must never be imported from client code —
 * the SDK credentials only resolve on the server.
 */
import ZAI from 'z-ai-web-dev-sdk';

/** Model identifier persisted alongside conversations and assistant messages. */
export const KIMI_MODEL = 'kimi-playbeat-1';

/** Persona of the PlayBeat Digital creative co-pilot. */
export const KIMI_SYSTEM_PROMPT = `You are KIMI, the AI creative co-pilot of PlayBeat Digital — the studio behind playbeatdigital.world. You live inside a node-graph workspace inspired by ComfyUI: every conversation flows through the nodes Prompt → Router → KIMI Core → Deliver.

You help creators — musicians, DJs, producers, digital artists, labels — imagine, write, plan and design: press kits, release notes, track descriptions, DJ set arcs, brand voice, flyer concepts, tour schedules, lyrical sparks, creative strategy.

Your tone is warm, vivid and precise — a little stage-light energy, never corporate boilerplate.

Format answers in clean Markdown: short paragraphs, bold the key moves, lists when useful. When an idea deserves a visual, describe it like a scene under spotlights. Keep answers tight and punchy unless the user asks to go deep.`;

/** A single conversation turn fed into the pipeline. */
export interface KimiHistoryItem {
  role: string;
  content: string;
}

/** How many trailing history turns the Router node lets through. */
const HISTORY_WINDOW = 40;

/** Backoff delays before retry attempts (2 retries: 1s, then 2s). */
const RETRY_DELAYS_MS = [1_000, 2_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the Prompt → Router → KIMI Core → Deliver pipeline:
 * the KIMI persona followed by the trailing history window (max 40 turns),
 * answered as a single non-streaming completion with thinking disabled.
 *
 * Retries twice with 1s/2s backoff before giving up.
 */
export async function runKimiPipeline(
  history: KimiHistoryItem[]
): Promise<{ content: string }> {
  const messages = [
    { role: 'assistant' as const, content: KIMI_SYSTEM_PROMPT },
    ...history
      .slice(-HISTORY_WINDOW)
      .map((turn) => ({
        role: turn.role as 'user' | 'assistant' | 'system',
        content: turn.content,
      })),
  ];

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error('KIMI Core returned an empty completion');
      }
      return { content };
    } catch (error) {
      lastError = error;
    }
  }

  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `KIMI pipeline failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${reason}`
  );
}
