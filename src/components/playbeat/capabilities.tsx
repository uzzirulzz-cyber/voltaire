"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Hammer,
  Palette,
  Presentation,
  Search,
  Table2,
} from "lucide-react";

/**
 * Capabilities — six studio tools, each styled as a ComfyUI node:
 * colored header strip, icon, copy. Same shared context as the chat.
 */

const CAPS = [
  {
    icon: Presentation,
    color: "#e3b23c",
    node: "slides.render",
    title: "Slides",
    desc: "From outline to polished deck, narrated for you.",
  },
  {
    icon: FileText,
    color: "#4a8a7d",
    node: "docs.compose",
    title: "Docs",
    desc: "Write, structure, and refine long-form work in place.",
  },
  {
    icon: Table2,
    color: "#c07a5f",
    node: "sheets.model",
    title: "Sheets",
    desc: "Model, calculate, and chart without leaving the thread.",
  },
  {
    icon: Palette,
    color: "#8f98a8",
    node: "design.mock",
    title: "Design",
    desc: "Mockups and visual explorations you can actually keep.",
  },
  {
    icon: Search,
    color: "#e3b23c",
    node: "research.deep",
    title: "Deep Research",
    desc: "Go past the surface with sourced, structured answers.",
  },
  {
    icon: Hammer,
    color: "#4a8a7d",
    node: "build.proto",
    title: "Build",
    desc: "Turn a working idea into a working prototype.",
  },
] as const;

export function Capabilities() {
  return (
    <section
      id="capabilities"
      className="relative z-10 scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/8 px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-gold-lt">
            CAPABILITIES
          </span>
          <h2 className="font-display text-2xl font-bold text-silver-lt sm:text-3xl">
            One workspace, <span className="text-gradient-gold">every medium</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-silver/60">
            Each tool shares the same context, so nothing gets lost moving
            between them.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.article
                key={cap.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.55,
                  delay: (i % 3) * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group overflow-hidden rounded-xl border border-silver/14 bg-gradient-to-b from-navy-mid/55 to-navy-deep/75 transition-all duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              >
                {/* node header strip */}
                <div className="flex items-center gap-2 border-b border-silver/12 px-4 py-2">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cap.color }}
                  />
                  <span className="font-mono text-[10px] text-silver/50">
                    {cap.node}
                  </span>
                </div>
                <div className="p-5">
                  <span
                    className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${cap.color}, rgba(200,205,214,0.85))`,
                    }}
                  >
                    <Icon
                      className="h-5 w-5 text-navy-deep"
                      strokeWidth={2.2}
                    />
                  </span>
                  <h3 className="font-display text-[15px] font-bold text-silver-lt">
                    {cap.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-silver/55">
                    {cap.desc}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
