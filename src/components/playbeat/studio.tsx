"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AudioWaveform,
  Database,
  Loader2,
  Lock,
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
import { NodeFlowCanvas } from "./node-flow-canvas";
import { useAuth } from "./auth-provider";
import type { ChatMessage, Conversation, HealthStatus } from "./types";

/**
 * Studio — the chatbox, wired to the session-cookie backend
 * (conversations persist per signed-in account — worklog Task 8).
 */

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
  const { user, loading: authLoading, openAuth } = useAuth();
  const { toast } = useToast();

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

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  /* ── health (public) ────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setHealth(await res.json());
      } catch {
        /* badges fall back to static */
      }
    })();
  }, []);

  /* ── sessions per account (cookie session) ──────────────────── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSessions([]);
      setActiveId(null);
      setMessages([]);
      setBooted(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (cancelled) return;
        const list: Conversation[] = data.conversations ?? [];
        setSessions(list);
        setActiveId((prev) =>
          list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? null),
        );
      } catch {
        if (!cancelled)
          toast({ title: "Could not load sessions", description: "The studio database did not answer." });
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, toast]);

  /* ── load messages when active session changes ─────────────── */
  useEffect(() => {
    if (!user || !activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${activeId}/messages`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        if (!cancelled)
          toast({ title: "Could not load messages", description: "Try reopening the session." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeId, toast]);

  /* ── autoscroll ─────────────────────────────────────────────── */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const pushStage = useCallback((s: PipelineStage, delay: number) => {
    const t = window.setTimeout(() => setStage(s), delay);
    timersRef.current.push(t);
  }, []);

  /* ── send (pipeline endpoint) ───────────────────────────────── */
  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending || !user) return;

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
          title: "PlayBeat pipeline hiccup",
          description: e instanceof Error ? e.message : "The model did not answer. Try again.",
        });
      } finally {
        if (seq === sendSeqRef.current) setSending(false);
      }
    },
    [input, sending, user, activeId, pushStage, toast],
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
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        toast({ title: "Could not delete session", description: "It may still be on the server." });
      }
    },
    [activeId, toast],
  );

  /* ── sessions list (sidebar + mobile sheet) ─────────────────── */
  const sessionList = (onPick: () => void) => (
    <div className="flex flex-col gap-1.5">
      {!user ? (
        <p className="px-2 py-6 text-center text-xs leading-relaxed text-dim/70">
          Sessions live in your account.
          <br />
          Sign in to keep your history.
        </p>
      ) : sessions.length === 0 && booted ? (
        <p className="px-2 py-6 text-center text-xs leading-relaxed text-dim/70">
          No sessions yet.
          <br />
          Your first prompt starts a new graph.
        </p>
      ) : (
        sessions.map((s) => {
          const active = s.id === activeId;
          return (
            <div
              key={s.id}
              className={[
                "group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-acc2/45 bg-acc2/10"
                  : "border-transparent hover:border-white/12 hover:bg-white/5",
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
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${active ? "text-acc2" : "text-dim"}`} />
                  <span className={`truncate text-[13px] font-medium ${active ? "text-ink" : "text-dim"}`}>
                    {s.title}
                  </span>
                </span>
                <span className="mt-0.5 block pl-5.5 text-[10.5px] text-dim/60">
                  {s.messageCount} msgs ·{" "}
                  {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete session ${s.title}`}
                onClick={() => deleteSession(s.id)}
                className="shrink-0 rounded-md p-1.5 text-dim/50 opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  /* ── chat body: auth gate → empty → messages ───────────────── */
  const chatBody = () => {
    if (authLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-acc1" />
        </div>
      );
    }
    if (!user) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
          <span className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,#a78bfa,#f472b6,#fbbf24,#a78bfa)] [animation:ringspin_6s_linear_infinite] blur-[2px]"
            />
            <span className="absolute inset-[2px] rounded-[14px] bg-void" />
            <Lock className="relative h-5 w-5 text-acc2" />
          </span>
          <h3 className="font-display text-lg font-bold text-ink">
            Sign in to open the studio
          </h3>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-dim">
            Your sessions, history and settings live in your account — private
            by default, on this server only.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => openAuth("signin")}
              className="pb-grad-btn sheen rounded-xl px-6 py-3 font-display text-sm font-bold"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => openAuth("signup")}
              className="glass rounded-xl px-6 py-3 font-display text-sm font-semibold text-ink transition-all hover:border-acc1/40 hover:text-acc1"
            >
              Create account
            </button>
          </div>
        </div>
      );
    }
    if (messages.length === 0 && !sending) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-acc2 to-acc3 font-display text-lg font-extrabold text-void shadow-[0_10px_36px_rgba(244,114,182,0.35)]">
            ◉
          </div>
          <h3 className="font-display text-lg font-bold text-ink">
            Warm, fast, and always in your corner
          </h3>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-dim">
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
                  className="glass group rounded-xl p-3 text-left transition-all hover:-translate-y-0.5 hover:border-acc2/40 hover:bg-white/8"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-acc2" />
                    <span className="text-xs font-semibold text-ink">{s.title}</span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-dim/80">
                    {s.prompt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="pb-pop max-w-[85%] rounded-[18px] rounded-br-md bg-gradient-to-br from-acc1 to-acc2 px-4 py-2.5 text-[13.5px] leading-relaxed font-medium text-void sm:max-w-[75%]">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-acc2 to-acc3 font-display text-[11px] font-extrabold text-void">
                ◉
              </div>
              <div className="glass pb-pop min-w-0 max-w-[85%] rounded-[18px] rounded-tl-md px-4 py-3 sm:max-w-[75%]">
                <Markdown content={m.content} />
              </div>
            </div>
          ),
        )}
        {sending && (
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-acc2 to-acc3 font-display text-[11px] font-extrabold text-void">
              ◉
            </div>
            <div className="glass flex items-center gap-2.5 rounded-[18px] rounded-tl-md px-5 py-4">
              <span className="flex gap-1.5" aria-label="PlayBeat is typing">
                <span className="pb-bounce-dot" />
                <span className="pb-bounce-dot" />
                <span className="pb-bounce-dot" />
              </span>
              <span className="text-[11px] text-dim">sampling the vibe…</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="studio" className="relative z-10 scroll-mt-28 overflow-hidden px-4 py-14 sm:px-6">
      {/* comfy.org-style node graph, alive behind the glass */}
      <NodeFlowCanvas className="absolute inset-0 h-full w-full opacity-30" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void via-transparent to-void"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <span className="glass mb-3 inline-block rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-acc3 uppercase">
            the chatbox
          </span>
          <h2 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink sm:text-3xl">
            Where the vibe becomes <span className="grad-text">a conversation</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-dim">
            Sessions persist in your account. Prompts proxy through the server —
            the model key never touches your browser.
          </p>
        </header>

        {/* chat shell: glass + spinning conic ring */}
        <div className="pb-conic-ring mx-auto w-[min(1060px,100%)] overflow-hidden rounded-3xl">
          <div className="glass overflow-hidden rounded-[24px]">
            {/* header */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/3 px-4 py-3 sm:px-5">
              <span className="heartbeat h-2.5 w-2.5 shrink-0 rounded-full bg-live [box-shadow:0_0_12px_#34d399]" aria-label="online" />
              <div className="min-w-0">
                <strong className="block font-display text-[13px] leading-tight text-ink">
                  PlayBeat
                </strong>
                <small className="block text-[11px] leading-tight text-dim">
                  online — vibing
                </small>
              </div>

              <span className="eq mx-2 hidden sm:inline-flex" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <span className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-dim sm:flex">
                  <Database className="h-3 w-3 text-live" />
                  SQLite · {health ? health.database : "…"}
                </span>
                <span className="hidden items-center gap-1.5 rounded-full border border-acc3/30 bg-acc3/10 px-2.5 py-1 text-[10px] font-medium text-acc3 sm:flex">
                  <Zap className="h-3 w-3" />
                  KIMI · {health ? health.ai : "…"}
                </span>
              </div>
            </div>

            <div className="flex">
              {/* sessions sidebar (desktop) */}
              <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-white/2 md:flex">
                <div className="flex items-center justify-between px-4 pb-2 pt-4">
                  <span className="text-[10px] font-semibold tracking-[0.16em] text-dim/70 uppercase">
                    sessions
                  </span>
                  <button
                    type="button"
                    onClick={newSession}
                    className="flex items-center gap-1 rounded-lg border border-acc2/35 bg-acc2/10 px-2 py-1 text-[10.5px] font-semibold text-acc2 transition-colors hover:bg-acc2/20"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                </div>
                <div className="pb-scroll max-h-[520px] flex-1 overflow-y-auto px-2.5 pb-4">
                  {sessionList(() => {})}
                </div>
                <div className="border-t border-white/10 px-4 py-3">
                  <p className="text-[10px] leading-relaxed text-dim/60">
                    {user
                      ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} · saved to ${user.name}'s account`
                      : "sign in to unlock sessions"}
                  </p>
                </div>
              </aside>

              {/* chat column */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* chat header (mobile) */}
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5 sm:px-5 md:hidden">
                  <Sheet open={sessionsOpen} onOpenChange={setSessionsOpen}>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        aria-label="Open sessions"
                        className="rounded-lg border border-white/12 bg-white/4 p-1.5 text-dim transition-colors hover:border-acc2/40 hover:text-acc2"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 border-white/12 bg-void p-0">
                      <SheetHeader className="border-b border-white/12 px-4 py-3">
                        <SheetTitle className="font-display text-sm text-ink">Sessions</SheetTitle>
                        <button
                          type="button"
                          onClick={newSession}
                          className="absolute top-3 right-4 flex items-center gap-1 rounded-lg border border-acc2/35 bg-acc2/10 px-2 py-1 text-[10.5px] font-semibold text-acc2"
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
                    <h3 className="truncate font-display text-[13px] font-semibold text-ink">
                      {activeSession ? activeSession.title : user ? "New session" : "Locked"}
                    </h3>
                    <p className="text-[10.5px] text-dim/70">
                      {activeSession
                        ? `${activeSession.messageCount} messages · ${activeSession.model}`
                        : "prompt → route → generate → deliver"}
                    </p>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-dim/50">
                    <span className={`h-1.5 w-1.5 rounded-full ${stage === 0 ? "bg-white/25" : "animate-pulse bg-acc2"}`} />
                    {stage === 0 ? "idle" : "executing"}
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
                <div className="border-t border-white/10 bg-white/2 px-3 py-2.5 sm:px-4">
                  <PipelineStrip stage={stage} />
                </div>

                {/* composer */}
                <form
                  className="flex items-end gap-3 border-t border-white/10 bg-white/3 p-3 sm:px-4"
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
                      disabled={!user}
                      placeholder={
                        user
                          ? activeSession
                            ? "Reply to PlayBeat…"
                            : "Drop your question, idea, or beat…"
                          : "Sign in to start chatting…"
                      }
                      aria-label="Message PlayBeat"
                      className="pb-scroll max-h-[132px] w-full resize-none rounded-2xl border border-white/14 bg-black/30 px-4 py-3 text-[13.5px] text-ink transition-all outline-none placeholder:text-dim/70 focus:border-acc1 focus:ring-[3px] focus:ring-acc1/20 disabled:opacity-60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !input.trim() || !user}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-void transition-transform [background:linear-gradient(135deg,#f472b6,#fbbf24)] [box-shadow:0_6px_24px_rgba(251,191,36,.3)] hover:scale-106 hover:-rotate-8 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:rotate-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <span className="text-lg leading-none">➤</span>
                    )}
                  </button>
                </form>
                <p className="border-t border-white/8 bg-black/20 px-4 py-1.5 text-center text-[10px] text-dim/60">
                  Enter ↵ to send · Shift+Enter for a new line · prompts are proxied server-side
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
