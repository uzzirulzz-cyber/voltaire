"use client";

/**
 * model-bots.tsx — the "Official bots" rail + live-preview chatbox embed
 * for the home-page mid-section.
 *
 * Ported from the uploaded Model Bots design (scrolling rail, conic-frame
 * spinning icons, flame pulse). Clicking a bot selects it as the chat
 * model; the chatbox streams replies token-by-token from
 * /api/chat/stream so the preview visibly builds up. Guests get an
 * ephemeral live preview; signed-in users keep sessions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./model-bots.module.css";
import { Markdown } from "./markdown";
import { useAuth } from "./auth-provider";

interface Bot {
  id: string;
  name: string;
  tag: string;
  model: string;
  accent: string;
  bg: string;
  persona: string;
  svg: React.ReactNode;
}

/* ── The official bots (design ported 1:1 from the Model Bots file) ──── */
const BOTS: Bot[] = [
  {
    id: "assistant",
    name: "Assistant",
    tag: "General",
    model: "gemini-2.5-flash",
    accent: "#7C6CF0",
    bg: "#7C6CF0",
    persona: "Answer with clear, practical, can-do guidance.",
    svg: (
      <>
        <circle cx="18" cy="18" r="13" fill="white" opacity=".95" />
        <circle cx="14" cy="17" r="2.3" fill="#7C6CF0" />
        <circle cx="22" cy="17" r="2.3" fill="#7C6CF0" />
        <path d="M12 23c2 2.2 10 2.2 12 0" stroke="#7C6CF0" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    id: "astra",
    name: "Astra",
    tag: "Reasoning",
    model: "gemini-2.5-pro",
    accent: "#1C1F26",
    bg: "#1C1F26",
    persona: "Think step by step; surface brief reasoning, then the answer.",
    svg: (
      <g fill="white">
        <circle cx="18" cy="18" r="3" />
        <circle cx="18" cy="7" r="1.6" />
        <circle cx="18" cy="29" r="1.6" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="29" cy="18" r="1.6" />
        <circle cx="10.5" cy="10.5" r="1.4" />
        <circle cx="25.5" cy="10.5" r="1.4" />
        <circle cx="10.5" cy="25.5" r="1.4" />
        <circle cx="25.5" cy="25.5" r="1.4" />
      </g>
    ),
  },
  {
    id: "opus",
    name: "Opus",
    tag: "Flagship",
    model: "gemini-2.5-pro",
    accent: "#C97A58",
    bg: "#1C1611",
    persona: "Flagship mode: the polished, complete, definitive answer.",
    svg: <g fill="#E3A07E"><path d="M18 5 L20 16 L31 18 L20 20 L18 31 L16 20 L5 18 L16 16 Z" /></g>,
  },
  {
    id: "fable",
    name: "Fable",
    tag: "Creative",
    model: "gemini-2.5-flash",
    accent: "#D9CFC2",
    bg: "#EFEBE3",
    persona: "Lead with story and imagery — make it vivid and warm.",
    svg: <g fill="#B89B7A"><path d="M18 6 L20.5 15.5 L30 18 L20.5 20.5 L18 30 L15.5 20.5 L6 18 L15.5 15.5 Z" /></g>,
  },
  {
    id: "argon",
    name: "Argon",
    tag: "Multimodal",
    model: "gemini-2.5-flash",
    accent: "#5AC8FA",
    bg: "#FFFFFF",
    persona: "Think multimodal: describe scenes, visuals and structure richly.",
    svg: (
      <>
        <path d="M18 6 C19 14 22 17 30 18 C22 19 19 22 18 30 C17 22 14 19 6 18 C14 17 17 14 18 6 Z" fill="url(#argonGrad)" />
        <defs>
          <linearGradient id="argonGrad" x1="6" y1="6" x2="30" y2="30">
            <stop offset="0" stopColor="#5AC8FA" />
            <stop offset=".5" stopColor="#8E7CF0" />
            <stop offset="1" stopColor="#F0B94F" />
          </linearGradient>
        </defs>
      </>
    ),
  },
  {
    id: "grok",
    name: "Grok",
    tag: "Realtime",
    model: "gemini-2.5-flash-lite",
    accent: "#2A2A2A",
    bg: "#141414",
    persona: "Fast and punchy — realtime energy, no preamble.",
    svg: (
      <>
        <circle cx="18" cy="18" r="12" fill="none" stroke="white" strokeWidth="2.6" />
        <line x1="10" y1="26" x2="26" y2="10" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "k3",
    name: "K3",
    tag: "Agentic",
    model: "gemini-2.5-pro",
    accent: "#2B2B2B",
    bg: "#161616",
    persona: "Plan like an agent: steps, tools, order of operations.",
    svg: (
      <g fill="white">
        <rect x="6" y="9" width="2.6" height="18" rx="1.3" />
        <rect x="11.2" y="6" width="2.6" height="24" rx="1.3" />
        <rect x="16.4" y="11" width="2.6" height="14" rx="1.3" />
        <rect x="21.6" y="7" width="2.6" height="22" rx="1.3" />
        <rect x="26.8" y="13" width="2.6" height="10" rx="1.3" />
      </g>
    ),
  },
  {
    id: "large-4",
    name: "Large-4",
    tag: "Open",
    model: "gemini-2.0-flash",
    accent: "#F0501E",
    bg: "#241712",
    persona: "Open and direct: transparent reasoning, zero fluff.",
    svg: (
      <g fill="none" strokeLinecap="round" strokeWidth="2.6">
        <path d="M11 24 L18 8 L25 24" stroke="#FFB94F" />
        <path d="M14 19 L22 19" stroke="#FF5B2E" />
      </g>
    ),
  },
  {
    id: "nova",
    name: "Nova",
    tag: "Vision",
    model: "gemini-2.5-flash",
    accent: "#49C5A0",
    bg: "#0F2420",
    persona: "See it first: layout, color, composition, what the eye meets.",
    svg: (
      <>
        <circle cx="18" cy="18" r="10" fill="none" stroke="#49C5A0" strokeWidth="2.4" />
        <circle cx="18" cy="18" r="3.4" fill="#49C5A0" />
      </>
    ),
  },
  {
    id: "solace",
    name: "Solace",
    tag: "Writing",
    model: "gemini-2.5-flash",
    accent: "#E86FA6",
    bg: "#241620",
    persona: "Write with warmth and calm; polished, humane prose.",
    svg: <path d="M9 26 C9 14 27 14 27 26 C20 22 14 22 9 26 Z" fill="#E86FA6" />,
  },
];

const NODES = ["Prompt", "Router", "Core", "Deliver"] as const;

interface PreviewMessage {
  role: "user" | "assistant";
  content: string;
}

export function ModelBots() {
  const { user, openAuth } = useAuth();
  const [activeBot, setActiveBot] = useState<Bot>(BOTS[0]);
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeStage, setNodeStage] = useState(-1);

  const conversationRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  /* Keep the preview pinned to the newest tokens as they build up. */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const appendDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last.role !== "assistant") return prev;
      copy[copy.length - 1] = { ...last, content: last.content + delta };
      return copy;
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    setNodeStage(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          model: activeBot.model,
          persona: activeBot.persona,
          conversationId: conversationRef.current ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || `Stream failed (HTTP ${response.status})`);
      }

      setNodeStage(1);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = rawEvent
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          let event: {
            t?: string;
            v?: string;
            conversationId?: string;
            chars?: number;
          };
          try {
            event = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }

          if (event.t === "meta" && event.conversationId) {
            conversationRef.current = event.conversationId;
            setNodeStage(2);
          } else if (event.t === "delta" && typeof event.v === "string") {
            setNodeStage((stage) => (stage < 2 ? 2 : stage));
            appendDelta(event.v as string);
          } else if (event.t === "done") {
            setNodeStage(3);
          } else if (event.t === "error") {
            throw new Error(event.v || "The pipeline hit an error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Stream failed");
      }
    } finally {
      setStreaming(false);
      setNodeStage(-1);
      abortRef.current = null;
    }
  }, [input, streaming, activeBot, appendDelta]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const lastIsStreamingAssistant =
    streaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  return (
    <section className="relative z-10 py-14 sm:py-20">
      <div className="mx-auto w-[min(980px,92vw)]">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
          Live preview — watch it build
        </p>
        <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Official bots
        </h2>
        <p className="mb-6 max-w-xl text-[13.5px] leading-relaxed text-dim">
          Pick a bot, ask anything. The reply streams in token by token —
          you watch every word land, then it&rsquo;s saved to your studio.
        </p>

        {/* ── the bot rail (exact design port) ─────────────────────────── */}
        <div className={styles.rail}>
          <div className={styles.track}>
            {[...BOTS, ...BOTS].map((bot, index) => {
              const isSelected = activeBot.id === bot.id;
              return (
                <button
                  key={`${bot.id}-${index}`}
                  type="button"
                  className={`${styles.card} ${isSelected ? styles.selected : ""}`}
                  onClick={() => setActiveBot(bot)}
                  aria-pressed={isSelected}
                  aria-label={`Use ${bot.name} — ${bot.tag}`}
                >
                  <span className={styles.icon}>
                    <span
                      className={styles.iconInner}
                      style={{ background: bot.bg }}
                    >
                      <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        {bot.svg}
                      </svg>
                    </span>
                  </span>
                  <span
                    className={`${styles.name} ${isSelected ? styles.selectedName : ""}`}
                  >
                    {bot.name}
                  </span>
                  <span className={`${styles.tag} text-dim`}>{bot.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── the chatbox embed ────────────────────────────────────────── */}
        <div className="glass mt-8 overflow-hidden rounded-2xl">
          {/* header: active bot + all-models picker + pipeline chips */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-4 py-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: activeBot.bg }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 36 36" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                {activeBot.svg}
              </svg>
            </span>
            <span className="text-[13px] font-semibold text-ink">
              {activeBot.name}
            </span>
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
              {activeBot.tag}
            </span>

            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-dim">
              <span className="hidden sm:inline">Model</span>
              <select
                value={activeBot.id}
                onChange={(event) => {
                  const bot = BOTS.find((b) => b.id === event.target.value);
                  if (bot) setActiveBot(bot);
                }}
                className="rounded-lg border border-white/12 bg-void/80 px-2 py-1 text-[11.5px] text-ink outline-none focus:border-acc1/60"
                aria-label="All models"
              >
                {BOTS.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name} · {bot.model}
                  </option>
                ))}
              </select>
            </label>

            {/* node pipeline — lights up as the reply builds */}
            <div className="flex w-full items-center gap-1 pt-1 sm:w-auto sm:pt-0">
              {NODES.map((node, index) => (
                <span key={node} className="flex items-center gap-1">
                  <span
                    className={`${styles.nodeChip} rounded-full border border-white/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim/80 ${
                      nodeStage >= index ? styles.nodeChipActive : ""
                    }`}
                  >
                    {node}
                  </span>
                  {index < NODES.length - 1 && (
                    <span className="text-dim/40" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* streaming viewport */}
          <div
            ref={viewportRef}
            className="pb-scroll max-h-[340px] min-h-[180px] overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="py-8 text-center text-[13px] text-dim/80">
                Ask {activeBot.name} anything — the answer will build up right
                here, live.
              </p>
            )}
            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="mb-3 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md border border-acc1/25 bg-acc1/10 px-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={index} className="mb-3 flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-panel-2/60 px-3.5 py-2">
                    <Markdown content={message.content} />
                    {lastIsStreamingAssistant &&
                      index === messages.length - 1 && (
                        <span className={styles.caret} aria-hidden="true" />
                      )}
                  </div>
                </div>
              )
            )}
            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-center text-[12.5px] text-red-200">
                {error}
              </p>
            )}
          </div>

          {/* input */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={
                  streaming
                    ? `${activeBot.name} is building the answer…`
                    : `Message ${activeBot.name}…`
                }
                disabled={streaming}
                className="pb-scroll max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-white/12 bg-void/60 px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-dim/60 outline-none focus:border-acc1/50 disabled:opacity-60"
                aria-label="Message"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="h-[42px] shrink-0 rounded-xl border border-white/15 px-4 text-[13px] font-semibold text-ink transition hover:border-red-300/40 hover:text-red-200"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={input.trim().length === 0}
                  className="h-[42px] shrink-0 rounded-xl bg-acc1 px-4 text-[13px] font-bold text-void transition hover:bg-acc3 disabled:opacity-40"
                >
                  Send
                </button>
              )}
            </div>
            <p className="mt-2 text-[11.5px] text-dim/70">
              {user ? (
                <span>
                  Streaming live · sessions saved to your studio · Enter to
                  send, Shift+Enter for a new line
                </span>
              ) : (
                <span>
                  Guest live preview — nothing is saved.{" "}
                  <button
                    type="button"
                    onClick={() => openAuth("signin")}
                    className="font-semibold text-acc1 underline decoration-acc1/40 underline-offset-2 hover:decoration-acc1"
                  >
                    Sign in
                  </button>{" "}
                  to keep your sessions.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
