/**
 * AI provider pipeline for Voltaire / PlayBeat Digital.
 *
 * Hugging Face Inference Providers uses its OpenAI-compatible chat endpoint.
 * HF_TOKEN is server-only. KIMI remains available as a fallback.
 */
import ZAI from 'z-ai-web-dev-sdk';

export const KIMI_MODEL = process.env.HF_MODEL || 'openai/gpt-oss-120b:fastest';

export const KIMI_SYSTEM_PROMPT = `You are KIMI, the AI creative co-pilot of PlayBeat Digital — the studio behind playbeatdigital.world. You live inside a node-graph workspace inspired by ComfyUI: every conversation flows through the nodes Prompt → Router → AI Core → Deliver.

You help creators — musicians, DJs, producers, digital artists, labels — imagine, write, plan and design: press kits, release notes, track descriptions, DJ set arcs, brand voice, flyer concepts, tour schedules, lyrical sparks, creative strategy.

Your tone is warm, vivid and precise — a little stage-light energy, never corporate boilerplate.

Format answers in clean Markdown: short paragraphs, bold the key moves, lists when useful. When an idea deserves a visual, describe it like a scene under spotlights. Keep answers tight and punchy unless the user asks to go deep.`;

export interface KimiHistoryItem {
  role: string;
  content: string;
}

const HISTORY_WINDOW = 40;
const RETRY_DELAYS_MS = [1_000, 2_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMessages(history: KimiHistoryItem[]) {
  return [
    { role: 'system' as const, content: KIMI_SYSTEM_PROMPT },
    ...history.slice(-HISTORY_WINDOW).map((turn) => ({
      role: (turn.role === 'assistant' || turn.role === 'system' ? turn.role : 'user') as
        | 'user'
        | 'assistant'
        | 'system',
      content: turn.content,
    })),
  ];
}

async function runHuggingFace(
  messages: ReturnType<typeof normalizeMessages>
): Promise<string> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN is not configured');

  const model = process.env.HF_MODEL || 'openai/gpt-oss-120b:fastest';
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  });

  if (!response.ok) {
    // Avoid exposing response bodies, which may include provider diagnostics.
    throw new Error(`Hugging Face request failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Hugging Face returned an empty completion');
  }
  return answer.trim();
}

async function runKimiFallback(
  messages: ReturnType<typeof normalizeMessages>
): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  });
  const answer = completion.choices[0]?.message?.content;
  if (!answer || !answer.trim()) throw new Error('KIMI returned an empty completion');
  return answer.trim();
}

/**
 * Uses Hugging Face when HF_TOKEN is configured (unless AI_PROVIDER=kimi).
 * If Hugging Face fails, optionally falls back to KIMI when AI_FALLBACK_KIMI=true.
 */
export async function runKimiPipeline(
  history: KimiHistoryItem[]
): Promise<{ content: string }> {
  const messages = normalizeMessages(history);
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  const hasHF = Boolean(process.env.HF_TOKEN);
  const useHF = provider === 'huggingface' || (provider === 'auto' && hasHF);
  const allowKimiFallback = process.env.AI_FALLBACK_KIMI !== 'false';

  let lastError: unknown;

  if (useHF) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
      try {
        return { content: await runHuggingFace(messages) };
      } catch (error) {
        lastError = error;
      }
    }

    if (allowKimiFallback) {
      try {
        return { content: await runKimiFallback(messages) };
      } catch (error) {
        lastError = error;
      }
    }
  } else if (provider === 'kimi' || !hasHF) {
    try {
      return { content: await runKimiFallback(messages) };
    } catch (error) {
      lastError = error;
    }
  } else {
    throw new Error('Unsupported AI_PROVIDER. Use auto, huggingface, or kimi.');
  }

  const reason = lastError instanceof Error ? lastError.message : 'Unknown provider error';
  throw new Error(`AI pipeline failed: ${reason}`);
}
