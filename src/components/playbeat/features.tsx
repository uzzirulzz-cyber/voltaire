"use client";

import { motion } from "framer-motion";
import { Zap, Brain, Lock } from "lucide-react";

/**
 * Features — the three glass cards (Instant · Sharp · Yours).
 * "Yours" ties to the account system: history lives in your account.
 */

const FEATURES = [
  {
    icon: Zap,
    title: "Instant",
    desc: "Replies tuned for speed — no spinner dread, just flow.",
  },
  {
    icon: Brain,
    title: "Sharp",
    desc: "Code, music, strategy — it bends to whatever you're making.",
  },
  {
    icon: Lock,
    title: "Yours",
    desc: "Your history lives in your account — private by default.",
  },
] as const;

export function Features() {
  return (
    <section
      id="features"
      className="relative z-10 mx-auto grid w-[min(920px,92vw)] scroll-mt-28 grid-cols-1 gap-5 py-16 sm:grid-cols-3 sm:py-20"
    >
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.article
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-acc2/40"
          >
            <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-acc1 to-acc2 text-void [box-shadow:0_8px_28px_rgba(244,114,182,0.3)]">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <h3 className="mb-2 font-display text-base font-bold text-ink">{f.title}</h3>
            <p className="text-[13.5px] leading-relaxed text-dim">{f.desc}</p>
          </motion.article>
        );
      })}
    </section>
  );
}
