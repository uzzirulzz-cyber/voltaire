"use client";

import { useEffect, useState } from "react";
import { Check, PenLine, GitBranch, Cpu, UploadCloud } from "lucide-react";

/**
 * PipelineStrip — the live "prompt → route → generate → deliver" node graph
 * that animates while KIMI processes a message.
 *
 * stage: 0 = idle · 1..4 = that node is active · 5 = complete (all done)
 */

export type PipelineStage = 0 | 1 | 2 | 3 | 4 | 5;

const NODES = [
  { label: "Prompt", sub: "text in", icon: PenLine },
  { label: "Router", sub: "route", icon: GitBranch },
  { label: "KIMI Core", sub: "generate", icon: Cpu },
  { label: "Deliver", sub: "reply out", icon: UploadCloud },
];

const CORE_STATUS = [
  "warming valves…",
  "routing signal…",
  "sampling tokens…",
  "mixing words…",
  "polishing output…",
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
      className="flex items-center gap-1 sm:gap-2 px-1"
      data-stage={stage}
    >
      {NODES.map((node, i) => {
        const state = nodeState(i, stage);
        const Icon = node.icon;
        return (
          <div key={node.label} className="flex min-w-0 flex-1 items-center">
            <div
              className={[
                "min-w-0 flex-1 rounded-lg border px-2 py-1.5 sm:px-2.5 transition-all duration-500",
                state === "idle"
                  ? "border-silver/12 bg-navy-mid/30 opacity-55"
                  : "",
                state === "active"
                  ? "border-gold/70 bg-navy-mid/70 animate-pb-node"
                  : "",
                state === "done"
                  ? "border-gold/45 bg-gold/10"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                {state === "done" ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                ) : (
                  <Icon
                    className={[
                      "h-3.5 w-3.5 shrink-0",
                      state === "active" ? "text-gold-lt" : "text-silver-dim",
                    ].join(" ")}
                    strokeWidth={2.2}
                  />
                )}
                <span
                  className={[
                    "truncate font-display text-[10px] font-semibold tracking-wide sm:text-[11px]",
                    state === "idle" ? "text-silver/70" : "text-silver-lt",
                  ].join(" ")}
                >
                  {node.label}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 pl-5.5">
                <span
                  className={[
                    "truncate text-[9px] leading-tight",
                    state === "active"
                      ? "text-gold-lt/90"
                      : "text-silver/40",
                  ].join(" ")}
                >
                  {state === "active" && i === 2
                    ? CORE_STATUS[statusIdx]
                    : node.sub}
                </span>
                {state === "active" && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-gold" />
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
                      ? "stroke-gold/80"
                      : "stroke-silver/20"
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
