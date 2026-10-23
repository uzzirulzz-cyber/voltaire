"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

/**
 * Closing — VOLTAIRE ticker rail + the final CTA band.
 * Ticker pauses on hover; disabled under reduced motion.
 */

const TICKER = [
  "VOLTAIRE — full regeneration",
  "people playing with the beat",
  "playbeat digital",
  "lifestyle atlas",
  "late-night studio sessions",
  "neon rooftop frequency",
  "your next big idea",
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Closing() {
  const items = [...TICKER, ...TICKER];
  return (
    <>
      {/* VOLTAIRE ticker rail */}
      <section
        aria-label="PlayBeat network ticker"
        className="relative z-10 overflow-hidden border-y border-white/12 py-3.5"
      >
        <div className="group flex w-max animate-[pb-marquee_28s_linear_infinite] items-center gap-10 [animation-play-state:running] hover:[animation-play-state:paused]">
          {items.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="flex items-center gap-2.5 text-[12px] whitespace-nowrap text-dim"
            >
              <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-acc3" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 px-4 py-20 sm:px-6">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-acc1/30 bg-gradient-to-br from-panel via-white/4 to-panel px-6 py-12 text-center [box-shadow:0_40px_90px_rgba(0,0,0,0.45),0_0_60px_rgba(250,204,21,0.1)] sm:py-14"
        >
          <div aria-hidden="true" className="pb-dots pointer-events-none absolute inset-0 opacity-50" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-acc2/20 blur-[90px]"
          />
          <h2 className="relative font-display text-2xl font-bold tracking-[-0.01em] text-ink sm:text-3xl">
            Ready to <span className="grad-text">groove</span>?
          </h2>
          <p className="relative mt-2.5 text-sm text-dim">
            A little curiosity. Endless possibility.
          </p>
          <a
            href="#studio"
            className="pb-grad-btn sheen relative mt-7 inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-display text-sm font-bold"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Start your first conversation
          </a>
        </motion.div>
      </section>
    </>
  );
}
