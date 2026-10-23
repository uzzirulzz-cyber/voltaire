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

function normalizeMessages(
  history: KimiHistoryItem[],
  personaSuffix?: string
) {
  const systemContent = personaSuffix
    ? `${KIMI_SYSTEM_PROMPT}\n\nBot persona: ${personaSuffix}`
    : KIMI_SYSTEM_PROMPT;
  return [
    { role: 'system' as const, content: systemContent },
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

/* ═══ Z.AI direct — OpenAI-compatible, env-configured, streaming ══════
 * Serverless-safe replacement for the .z-ai-config-file SDK path: the
 * same gateway the SDK talks to, called with plain fetch + headers.
 * Env (all optional; provider activates only when complete):
 *   ZAI_BASE_URL, ZAI_API_KEY (Bearer), ZAI_TOKEN,
 *   ZAI_CHAT_ID, ZAI_USER_ID
 */
interface ZaiDirectConfig {
  baseUrl: string;
  apiKey: string;
  token: string;
  chatId: string;
  userId: string;
}

function zaiDirectConfig(): ZaiDirectConfig | null {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const token = process.env.ZAI_TOKEN;
  if (!baseUrl || !apiKey || !token) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    token,
    chatId: process.env.ZAI_CHAT_ID || '',
    userId: process.env.ZAI_USER_ID || '',
  };
}

function zaiDirectHeaders(cfg: ZaiDirectConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Token': cfg.token,
  };
  if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
  if (cfg.userId) headers['X-User-Id'] = cfg.userId;
  return headers;
}

/** True when the env-configured Z.AI direct provider is available. */
export function hasZaiDirect(): boolean {
  return zaiDirectConfig() !== null;
}

/* ═══ Gemini — Google AI Studio public API (works from any network) ═══ */
function geminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

/** True when the Gemini provider is configured. */
export function hasGemini(): boolean {
  return geminiApiKey() !== null;
}

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL_RE = /^gemini-[0-9][a-zA-Z0-9.\-]*$/;

function isGeminiModel(model: string): boolean {
  return GEMINI_MODEL_RE.test(model);
}

type ChatMessage = { role: string; content: string };

/**
 * Gemini streamGenerateContent (SSE). Yields text deltas.
 * Endpoint is public (no IP allowlist) — works from Vercel serverless.
 */
async function* streamGemini(
  messages: ChatMessage[],
  model: string,
  maxTokens: number
): AsyncGenerator<string, void, unknown> {
  const key = geminiApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => ({ text: m.content }));
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
  };
  if (systemParts.length > 0) body.systemInstruction = { parts: systemParts };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    }
  );

  if (!response.ok || !response.body) {
    let detail = '';
    try {
      const err = (await response.json()) as {
        error?: { message?: string };
      };
      detail = err.error?.message ? `: ${err.error.message.slice(0, 200)}` : '';
    } catch {
      /* body not JSON */
    }
    throw new Error(`Gemini failed (HTTP ${response.status})${detail}`);
  }

  /* SSE frames: data: {"candidates":[{"content":{"parts":[{"text":"…"}]}}]} */
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: unknown }> };
          }>;
        };
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text) yield part.text;
        }
      } catch {
        /* partial JSON — wait for more bytes */
      }
    }
  }
}

/** Non-streaming Gemini generateContent (for /api/chat). */
async function runGemini(
  messages: ChatMessage[],
  model: string
): Promise<string> {
  const key = geminiApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => ({ text: m.content }));
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };
  if (systemParts.length > 0) body.systemInstruction = { parts: systemParts };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini failed (HTTP ${response.status})`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const answer = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('');
  if (!answer.trim()) throw new Error('Gemini returned an empty completion');
  return answer.trim();
}

/** Parse an OpenAI-compatible SSE body, yielding content deltas. */
async function* parseSseDeltas(
  response: Response
): AsyncGenerator<string, void, unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: unknown } }>;
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch {
        /* partial JSON line — wait for more bytes */
      }
    }
  }
}

/**
 * Streaming pipeline — yields reply text deltas as they arrive.
 * Provider chain: Hugging Face (SSE) → Z.AI direct (SSE) → SDK
 * (non-streaming, re-chunked so the UI still builds up live).
 */
export async function* streamKimiPipeline(
  history: KimiHistoryItem[],
  options: { model?: string; maxTokens?: number; persona?: string } = {}
): AsyncGenerator<string, void, unknown> {
  const messages = normalizeMessages(history, options.persona);
  const maxTokens = options.maxTokens ?? 2048;
  const requestedModel = options.model?.trim();

  /* ── Hugging Face (OpenAI-compatible SSE) ─────────────────────────── */
  const hfToken = process.env.HF_TOKEN;
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  const useHF =
    hfToken &&
    (provider === 'huggingface' || (provider === 'auto' && !zaiDirectConfig()));
  if (useHF) {
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: requestedModel || process.env.HF_MODEL || 'openai/gpt-oss-120b:fastest',
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: AbortSignal.timeout(90_000),
        cache: 'no-store',
      }
    );
    if (response.ok && response.body) {
      yield* parseSseDeltas(response);
      return;
    }
    /* fall through to Z.AI direct on failure */
  }

  /* ── Gemini (public Google AI Studio API — works from serverless) ── */
  const geminiKey = geminiApiKey();
  if (geminiKey) {
    const model =
      requestedModel && isGeminiModel(requestedModel)
        ? requestedModel
        : GEMINI_DEFAULT_MODEL;
    yield* streamGemini(messages, model, maxTokens);
    return;
  }

  /* ── Z.AI direct (OpenAI-compatible SSE) ──────────────────────────── */
  const cfg = zaiDirectConfig();
  if (cfg) {
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: zaiDirectHeaders(cfg),
      body: JSON.stringify({
        model: requestedModel || 'glm-4.6',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: true,
        thinking: { type: 'disabled' },
      }),
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    });
    if (response.ok && response.body) {
      yield* parseSseDeltas(response);
      return;
    }
    if (!process.env.AI_FALLBACK_KIMI || process.env.AI_FALLBACK_KIMI !== 'false') {
      /* fall through to SDK chunking */
    } else {
      throw new Error(`Z.AI direct failed (HTTP ${response.status})`);
    }
  }

  /* ── SDK fallback: full completion, re-chunked into visible deltas ── */
  const content = await runKimiFallback(messages);
  const chunks = content.match(/\S+\s*|\s+/g) ?? [content];
  for (const chunk of chunks) {
    yield chunk;
    await sleep(12); // typewriter cadence — preview visibly builds up
  }
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

  /* ── Gemini, non-streaming (public API, serverless-safe) ──────────── */
  if (geminiApiKey()) {
    try {
      return { content: await runGemini(messages, GEMINI_DEFAULT_MODEL) };
    } catch (error) {
      lastError = error;
    }
  }

  /* ── Z.AI direct, non-streaming (serverless-safe) ─────────────────── */
  const zcfg = zaiDirectConfig();
  if (zcfg && provider !== 'huggingface') {
    try {
      const response = await fetch(`${zcfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: zaiDirectHeaders(zcfg),
        body: JSON.stringify({
          model: 'glm-4.6',
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          thinking: { type: 'disabled' },
        }),
        signal: AbortSignal.timeout(90_000),
        cache: 'no-store',
      });
      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string | null } }>;
        };
        const answer = data.choices?.[0]?.message?.content;
        if (typeof answer === 'string' && answer.trim()) {
          return { content: answer.trim() };
        }
      }
      lastError = new Error(`Z.AI direct failed (HTTP ${response.status})`);
    } catch (error) {
      lastError = error;
    }
  }

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
