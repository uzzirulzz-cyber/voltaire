"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
  AudioWaveform,
  Database,
  Loader2,
  Megaphone,
  MessageSquare,
  Palette,
  PanelLeftClose,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PipelineStrip, type PipelineStage } from "./pipeline-strip";
import { Markdown } from "./markdown";
import type { ChatMessage, Conversation, HealthStatus } from "./types";

const UID_KEY = "playbeat-uid";

function getUid(): string {
  if (typeof window === "undefined") return "";
  let uid = window.localStorage.getItem(UID_KEY);
  if (!uid) {
    uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

const SUGGESTIONS = [
  {
    icon: Sparkles,
    title: "Press kit, one take",
    prompt:
      "Write a punchy two-paragraph press kit intro for my new single “Midnight Signal” — late-night neon energy, hometown pride.",
  },
  {
    icon: AudioWaveform,
    title: "Sunrise closing set",
    prompt:
      "Design a 90-minute DJ set arc for a sunrise closing set — mood, BPM journey, and 3 tracks to anchor each phase.",
  },
  {
    icon: Megaphone,
    title: "Label brand voice",
    prompt:
      "Define the brand voice for my underground house label in 5 lines — tone, vocabulary, and what we never say.",
  },
  {
    icon: Palette,
    title: "Release flyer concept",
    prompt:
      "Concept a release flyer: neon rim-light, smoke, a single dancing silhouette. Describe layout, palette, and typography.",
  },
] as const;

interface ChatApiReply {
  conversationId: string;
  conversation: Conversation;
  reply: ChatMessage;
}

export function Studio() {
  const { toast } = useToast();
  const [uid, setUid] = useState("");
  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState<PipelineStage>(0);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [booted, setBooted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timersRef = useRef<number[]>([]);
  const sendSeqRef = useRef(0);

  const activeSession =
    sessions.find((s) => s.id === activeId) ?? null;

  /* ── boot: uid → health → sessions ─────────────────────────────── */
  useEffect(() => {
    const id = getUid();
    setUid(id);
    (async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setHealth(await res.json());
      } catch {
        /* badges fall back to static */
      }
      try {
        const res = await fetch(`/api/conversations?uid=${encodeURIComponent(id)}`);
        const data = await res.json();
        const list: Conversation[] = data.conversations ?? [];
        setSessions(list);
        if (list.length > 0) setActiveId(list[0].id);
      } catch {
        toast({
          title: "Could not load sessions",
          description: "The studio database did not answer.",
        });
      } finally {
        setBooted(true);
      }
    })();
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /* ── load messages when active session changes ─────────────────── */
  useEffect(() => {
    if (!uid || !activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/conversations/${activeId}/messages?uid=${encodeURIComponent(uid)}`,
        );
        if (!res.ok) throw new Error("load failed");
        const data = await res.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        if (!cancelled) {
          toast({ title: "Could not load messages", description: "Try reopening the session." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, activeId, toast]);

  /* ── autoscroll ────────────────────────────────────────────────── */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const pushStage = useCallback((s: PipelineStage, delay: number) => {
    const t = window.setTimeout(() => setStage(s), delay);
    timersRef.current.push(t);
  }, []);

  /* ── send ──────────────────────────────────────────────────────── */
  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending || !uid) return;

      const seq = ++sendSeqRef.current;
      const optimistic: ChatMessage = {
        id: `tmp-${seq}`,
        role: "user",
        content: text,
        model: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSending(true);

      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      setStage(1);
      pushStage(2, 420);
      pushStage(3, 980);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            conversationId: activeId ?? undefined,
            message: text,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? `Pipeline error (${res.status})`);
        }
        const data: ChatApiReply = await res.json();
        if (seq !== sendSeqRef.current) return;

        setMessages((m) => [
          ...m.filter((x) => x.id !== optimistic.id),
          data.reply,
        ]);
        setSessions((list) => {
          const next = list.filter((s) => s.id !== data.conversation.id);
          return [data.conversation, ...next];
        });
        setActiveId(data.conversation.id);
        setStage(5);
        pushStage(0, 1600);
      } catch (e) {
        if (seq !== sendSeqRef.current) return;
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setStage(0);
        toast({
          title: "KIMI pipeline hiccup",
          description:
            e instanceof Error ? e.message : "The model did not answer. Try again.",
        });
      } finally {
        if (seq === sendSeqRef.current) setSending(false);
      }
    },
    [input, sending, uid, activeId, pushStage, toast],
  );

  const newSession = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setActiveId(null);
    setMessages([]);
    setStage(0);
    setSessionsOpen(false);
    textareaRef.current?.focus();
  }, []);

  const selectSession = useCallback(
    (id: string) => {
      if (sending) return;
      setActiveId(id);
      setSessionsOpen(false);
    },
    [sending],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      setSessions((list) => list.filter((s) => s.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      try {
        await fetch(
          `/api/conversations/${id}?uid=${encodeURIComponent(uid)}`,
          { method: "DELETE" },
        );
      } catch {
        toast({ title: "Could not delete session", description: "It may still be on the server." });
      }
    },
    [activeId, uid, toast],
  );

  /* ── sessions list (shared by sidebar + mobile sheet) ──────────── */
  const sessionList = (onPick: () => void) => (
    <div className="flex flex-col gap-1.5">
      {sessions.length === 0 && booted && (
        <p className="px-2 py-6 text-center text-xs leading-relaxed text-silver/45">
          No sessions yet.
          <br />
          Your first prompt starts a new graph.
        </p>
      )}
      {sessions.map((s) => {
        const active = s.id === activeId;
        return (
          <div
            key={s.id}
            className={[
              "group relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-gold/45 bg-gold/10"
                : "border-transparent hover:border-silver/15 hover:bg-navy-soft/40",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => {
                selectSession(s.id);
                onPick();
              }}
              className="min-w-0 flex-1"
              aria-current={active ? "true" : undefined}
            >
              <span className="flex items-center gap-2">
                <MessageSquare
                  className={`h-3.5 w-3.5 shrink-0 ${active ? "text-gold-lt" : "text-silver-dim"}`}
                />
                <span
                  className={`truncate text-[13px] font-medium ${active ? "text-silver-lt" : "text-silver/85"}`}
                >
                  {s.title}
                </span>
              </span>
              <span className="mt-0.5 block pl-5.5 text-[10.5px] text-silver/45">
                {s.messageCount} msgs ·{" "}
                {formatDistanceToNow(new Date(s.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete session ${s.title}`}
              onClick={() => deleteSession(s.id)}
              className="shrink-0 rounded-md p-1.5 text-silver/35 opacity-0 transition-all hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );

  /* ── message list ──────────────────────────────────────────────── */
  const chatBody = () => (
    <>
      {messages.length === 0 && !sending ? (
        <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-silver font-display text-lg font-extrabold text-navy-deep shadow-[0_10px_36px_rgba(227,178,60,0.35)]">
            K
          </div>
          <h3 className="font-display text-lg font-bold text-silver-lt">
            A quiet studio, wired for big ideas
          </h3>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-silver/55">
            Every message flows through the graph — prompt → route → generate →
            deliver. Start anywhere.
          </p>
          <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => send(s.prompt)}
                  className="group rounded-xl border border-silver/12 bg-navy-mid/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:bg-navy-mid/70 hover:shadow-[0_10px_30px_rgba(227,178,60,0.12)]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gold" />
                    <span className="text-xs font-semibold text-silver-lt">
                      {s.title}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-silver/50">
                    {s.prompt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md border border-silver/12 bg-navy-soft/60 px-4 py-2.5 text-[13.5px] leading-relaxed text-silver-lt sm:max-w-[75%]">
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-2.5 sm:gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-silver font-display text-[11px] font-extrabold text-navy-deep">
                  K
                </div>
                <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md border border-silver/12 bg-gradient-to-br from-navy-mid/70 to-navy-deep/80 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.25)] sm:max-w-[75%]">
                  <Markdown content={m.content} />
                </div>
              </div>
            ),
          )}
          {sending && (
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-silver font-display text-[11px] font-extrabold text-navy-deep">
                K
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-gold/25 bg-navy-mid/60 px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pb-dot rounded-full bg-gold" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-pb-dot rounded-full bg-gold" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-pb-dot rounded-full bg-gold" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-[11px] text-silver/55">
                  KIMI is rendering through the graph…
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <section id="studio" className="relative z-10 scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
      {/* ambient glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-gold/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-silver/8 blur-[130px]" />

      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/8 px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-gold-lt">
            THE STUDIO
          </span>
          <h2 className="font-display text-2xl font-bold text-silver-lt sm:text-3xl">
            Chat, wired through a <span className="text-gradient-gold">live node graph</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-silver/60">
            Sessions persist in the studio database. Prompts proxy through the
            server — the model key never touches your browser.
          </p>
        </header>

        {/* editor window */}
        <div className="overflow-hidden rounded-2xl border border-silver/15 bg-gradient-to-b from-navy-mid/70 to-navy-deep/90 shadow-[0_40px_90px_rgba(0,0,0,0.5)]">
          {/* window chrome */}
          <div className="flex items-center gap-3 border-b border-silver/12 bg-navy-deep/60 px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5604f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3b23c]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#57a773]" />
            </span>
            <span className="truncate font-mono text-[11px] text-silver/60">
              playbeat_session.flow
            </span>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-silver/12 bg-navy-mid/60 px-2.5 py-1 text-[10px] font-medium text-silver/70 sm:flex">
                <Database className="h-3 w-3 text-[#57a773]" />
                SQLite · {health ? health.database : "checking…"}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/8 px-2.5 py-1 text-[10px] font-medium text-gold-lt">
                <Zap className="h-3 w-3" />
                KIMI · {health ? health.ai : "checking…"}
              </span>
            </div>
          </div>

          <div className="flex">
            {/* sessions sidebar (desktop) */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-silver/12 bg-navy-deep/40 md:flex">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <span className="text-[10px] font-semibold tracking-[0.16em] text-silver/45">
                  SESSIONS
                </span>
                <button
                  type="button"
                  onClick={newSession}
                  className="flex items-center gap-1 rounded-md border border-gold/35 bg-gold/10 px-2 py-1 text-[10.5px] font-semibold text-gold-lt transition-colors hover:bg-gold/20"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              <div className="pb-scroll max-h-[520px] flex-1 overflow-y-auto px-2.5 pb-4">
                {sessionList(() => {})}
              </div>
              <div className="border-t border-silver/10 px-4 py-3">
                <p className="text-[10px] leading-relaxed text-silver/35">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"} ·
                  stored on your studio database
                </p>
              </div>
            </aside>

            {/* chat column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* chat header */}
              <div className="flex items-center gap-3 border-b border-silver/10 px-4 py-2.5 sm:px-5">
                {/* mobile sessions */}
                <Sheet open={sessionsOpen} onOpenChange={setSessionsOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      aria-label="Open sessions"
                      className="rounded-md border border-silver/15 p-1.5 text-silver/70 transition-colors hover:border-gold/40 hover:text-gold-lt md:hidden"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-silver/15 bg-navy-deep p-0">
                    <SheetHeader className="border-b border-silver/12 px-4 py-3">
                      <SheetTitle className="font-display text-sm text-silver-lt">
                        Sessions
                      </SheetTitle>
                      <button
                        type="button"
                        onClick={newSession}
                        className="absolute right-4 top-3 flex items-center gap-1 rounded-md border border-gold/35 bg-gold/10 px-2 py-1 text-[10.5px] font-semibold text-gold-lt"
                      >
                        <Plus className="h-3 w-3" />
                        New
                      </button>
                    </SheetHeader>
                    <div className="pb-scroll h-[calc(100%-3.4rem)] overflow-y-auto px-2.5 py-3">
                      {sessionList(() => setSessionsOpen(false))}
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <h3 className="truncate font-display text-[13px] font-semibold text-silver-lt">
                    {activeSession ? activeSession.title : "New session"}
                  </h3>
                  <p className="text-[10.5px] text-silver/45">
                    {activeSession
                      ? `${activeSession.messageCount} messages · ${activeSession.model}`
                      : "prompt → route → generate → deliver"}
                  </p>
                </div>
                <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-silver/40 sm:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${stage === 0 ? "bg-silver/30" : "bg-gold animate-pulse"}`} />
                  {stage === 0 ? "graph idle" : "graph executing"}
                </span>
              </div>

              {/* messages */}
              <div
                ref={scrollRef}
                className="pb-scroll h-[440px] overflow-y-auto sm:h-[480px]"
                role="log"
                aria-live="polite"
                aria-label="Conversation"
              >
                {chatBody()}
              </div>

              {/* pipeline */}
              <div className="border-t border-silver/10 bg-navy-deep/50 px-3 py-2.5 sm:px-4">
                <PipelineStrip stage={stage} />
              </div>

              {/* composer */}
              <form
                className="flex items-end gap-2.5 border-t border-silver/10 bg-navy-deep/70 p-3 sm:px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <div className="relative min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value.slice(0, 4000));
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    maxLength={4000}
                    placeholder={
                      activeSession
                        ? "Reply to KIMI…"
                        : "Ask anything, or imagine something new…"
                    }
                    aria-label="Message KIMI"
                    className="pb-scroll max-h-[132px] w-full resize-none rounded-xl border border-silver/15 bg-navy-mid/50 px-3.5 py-2.5 text-[13.5px] text-silver-lt placeholder:text-silver/35 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/25"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="pb-gold-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                >
                  {sending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.5} />
                  )}
                </button>
              </form>
              <p className="border-t border-silver/8 bg-navy-deep/80 px-4 py-1.5 text-center text-[10px] text-silver/30">
                Enter ↵ to send · Shift+Enter for a new line · prompts are
                proxied server-side
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
