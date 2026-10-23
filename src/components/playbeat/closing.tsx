"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Closing() {
  return (
    <>
      {/* quote band */}
      <section
        aria-label="Manifesto"
        className="relative z-10 px-4 py-14 sm:px-6 sm:py-20"
      >
        <motion.blockquote
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-display text-xl font-semibold leading-relaxed text-silver-lt sm:text-2xl">
            “A quiet space to think bigger.
            <br />
            A capable partner to go further.”
          </p>
          <cite className="mt-4 block text-xs not-italic tracking-wide text-gold-lt">
            — the idea behind PlayBeat AI
          </cite>
        </motion.blockquote>
      </section>

      {/* CTA band */}
      <section className="relative z-10 px-4 pb-20 sm:px-6">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-navy-mid via-navy-soft/70 to-navy-mid px-6 py-12 text-center shadow-[0_40px_90px_rgba(0,0,0,0.45)] sm:py-16"
        >
          {/* inner glow + dots */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold opacity-20 blur-[90px]"
          />
          <div aria-hidden="true" className="pb-dots pointer-events-none absolute inset-0 opacity-40" />

          <h2 className="relative font-display text-2xl font-bold text-silver-lt sm:text-3xl">
            Ready to think bigger?
          </h2>
          <p className="relative mt-2.5 text-sm text-silver/65">
            A little curiosity. Endless possibility.
          </p>
          <a
            href="#studio"
            className="pb-gold-btn relative mt-7 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-display text-sm font-bold"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Start your first conversation
          </a>
        </motion.div>
      </section>
    </>
  );
}
