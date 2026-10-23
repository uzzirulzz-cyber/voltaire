"use client";

import { motion } from "framer-motion";
import { ChevronDown, Play } from "lucide-react";
import { NodeFlowCanvas } from "./node-flow-canvas";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  return (
    <section
      id="flow"
      className="relative flex min-h-[92vh] scroll-mt-16 flex-col overflow-hidden"
    >
      {/* ambient node-graph canvas */}
      <NodeFlowCanvas className="absolute inset-0 h-full w-full" />

      {/* glow orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-gold opacity-[0.16] blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-72 h-[420px] w-[420px] rounded-full bg-silver opacity-[0.07] blur-[120px]" />

      {/* readability vignette + bottom fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(10,15,28,0.72) 0%, rgba(10,15,28,0.3) 55%, rgba(10,15,28,0.05) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background: "linear-gradient(to bottom, transparent, #0a0f1c)",
        }}
      />

      {/* content */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/8 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-gold-lt backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
          NODE-GRAPH AI · POWERED BY KIMI
        </motion.span>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.12}
          className="font-display text-[2.5rem] font-bold leading-[1.06] tracking-tight sm:text-6xl"
        >
          <span className="text-gradient-gold">Your ideas,</span>
          <br />
          <span className="text-silver-lt">in motion</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.24}
          className="mt-5 max-w-xl text-[15px] leading-relaxed text-silver/70 sm:text-base"
        >
          PlayBeat AI wires chat into a living node graph —{" "}
          <span className="text-gold-lt">prompt → route → generate → deliver</span>{" "}
          — so the idea in your head becomes the thing in your hand.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.36}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#studio"
            className="pb-gold-btn flex items-center gap-2 rounded-xl px-6 py-3 font-display text-sm font-bold"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Launch the Studio
          </a>
          <a
            href="#gallery"
            className="rounded-xl border border-silver/25 bg-navy-deep/40 px-6 py-3 font-display text-sm font-semibold text-silver-lt backdrop-blur-sm transition-all hover:border-gold/40 hover:text-gold-lt"
          >
            See the flow
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.5}
          className="mt-12 text-[11px] text-silver/40"
        >
          Built by the team behind
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 font-display text-xs font-semibold tracking-wide text-silver/60">
            <span>PlayBeat Digital</span>
            <span className="hidden text-gold/50 sm:inline">·</span>
            <span>VOLTAIRE</span>
            <span className="hidden text-gold/50 sm:inline">·</span>
            <span>Lifestyle Atlas</span>
          </div>
        </motion.div>
      </div>

      {/* scroll hint */}
      <motion.a
        href="#studio"
        aria-label="Scroll to the Studio"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.4], y: [0, 0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 mx-auto mb-6 text-silver/50 hover:text-gold-lt"
      >
        <ChevronDown className="h-6 w-6" />
      </motion.a>
    </section>
  );
}
