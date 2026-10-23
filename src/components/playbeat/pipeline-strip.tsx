"use client";

import { useEffect, useState } from "react";
import { Check, PenLine, GitBranch, Cpu, UploadCloud } from "lucide-react";

/**
 * PipelineStrip — the living signal path that animates while PlayBeat
 * feels out a message: you drop it → PlayBeat listens → KIMI feels it →
 * it hits back.
 *
 * stage: 0 = idle · 1..4 = that node is active · 5 = complete (all done)
 */

export type PipelineStage = 0 | 1 | 2 | 3 | 4 | 5;

const NODES = [
  { label: "Prompt", sub: "you drop it", icon: PenLine },
  { label: "PlayBeat", sub: "listens to you", icon: GitBranch },
  { label: "KIMI", sub: "feels the groove", icon: Cpu },
  { label: "Reply", sub: "it hits back", icon: UploadCloud },
];

const CORE_STATUS = [
  "tuning the room…",
  "feeling it out…",
  "finding the words…",
  "mixing the reply…",
  "last polish…",
];

function nodeState(
  index: number,
  stage: PipelineStage,
): "idle" | "active" | "done" {
  if (stage === 5) return "done";
  if (stage === 0) return "idle";
  if (stage === index + 1) return "active";
  if (stage > index + 1) return "done";
  return "idle";
}

export function PipelineStrip({ stage }: { stage: PipelineStage }) {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    if (stage !== 3) return;
    const id = setInterval(
      () => setStatusIdx((i) => (i + 1) % CORE_STATUS.length),
      1800,
    );
    return () => clearInterval(id);
  }, [stage]);

  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-1 px-1 sm:gap-2"
      data-stage={stage}
    >
      {NODES.map((node, i) => {
        const state = nodeState(i, stage);
        const Icon = node.icon;
        return (
          <div key={node.label} className="flex min-w-0 flex-1 items-center">
            <div
              className={[
                "min-w-0 flex-1 rounded-xl border px-2 py-1.5 transition-all duration-500 sm:px-2.5",
                state === "idle"
                  ? "border-white/12 bg-white/4 opacity-55"
                  : "",
                state === "active"
                  ? "animate-pb-node border-acc2/70 bg-white/6"
                  : "",
                state === "done"
                  ? "border-acc3/45 bg-acc3/10"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                {state === "done" ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-acc3 text-void">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                ) : (
                  <Icon
                    className={[
                      "h-3.5 w-3.5 shrink-0",
                      state === "active" ? "text-acc2" : "text-dim",
                    ].join(" ")}
                    strokeWidth={2.2}
                  />
                )}
                <span
                  className={[
                    "truncate font-display text-[10px] font-semibold tracking-wide sm:text-[11px]",
                    state === "idle" ? "text-dim/80" : "text-ink",
                  ].join(" ")}
                >
                  {node.label}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 pl-5.5">
                <span
                  className={[
                    "truncate text-[9px] leading-tight",
                    state === "active" ? "text-acc1/90" : "text-dim/50",
                  ].join(" ")}
                >
                  {state === "active" && i === 2
                    ? CORE_STATUS[statusIdx]
                    : node.sub}
                </span>
                {state === "active" && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-acc2" />
                )}
              </div>
            </div>

            {i < NODES.length - 1 && (
              <svg
                viewBox="0 0 40 12"
                className="h-3 w-6 shrink-0 sm:w-9"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 6 C 14 6, 26 6, 40 6"
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className={
                    stage >= i + 2 || stage === 5
                      ? "stroke-acc3/80"
                      : "stroke-white/20"
                  }
                  strokeDasharray={stage === i + 1 ? "5 6" : "none"}
                  style={
                    stage === i + 1
                      ? { animation: "pb-wire 0.7s linear infinite" }
                      : undefined
                  }
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
