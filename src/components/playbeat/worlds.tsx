"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Worlds — the living world, humanized: real people, real nights.
 * Hover: card lifts + tilts, image zooms 1.12 over 0.8s.
 */

const WORLDS = [
  {
    emoji: "🌆",
    title: "Afterglow Rooftop",
    desc: "Find the dance floor. Find your people.",
    src: "/images/living/living-07.jpg",
    alt: "A performer in a leather jacket in front of a crowd with raised hands under blue light",
    span: "",
  },
  {
    emoji: "🌃",
    title: "Midnight Run",
    desc: "City lights. Your own lane.",
    src: "/images/living/living-08.jpg",
    alt: "Night drive through a city with lights streaking by",
    span: "",
  },
  {
    emoji: "🏍",
    title: "Neon Circuit",
    desc: "Lean into the night.",
    src: "/images/living/living-09.jpg",
    alt: "Superbike leaning through a neon-lit corner at night",
    span: "",
  },
  {
    emoji: "🍸",
    title: "Blue Tide",
    desc: "Poolside people. Cocktails on ice — rum & coke, no rush.",
    src: "/images/living/living-10.jpg",
    alt: "People around a poolside lounge at night with drinks",
    span: "",
  },
  {
    emoji: "🚉",
    title: "Last train, still glowing",
    desc: "Let the city carry the beat — the little moments between the big ones.",
    src: "/images/living/living-02.jpg",
    alt: "Train lights after dark, the city still glowing around it",
    span: "sm:col-span-2",
  },
] as const;

export function Worlds() {
  return (
    <section
      id="worlds"
      className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-28 px-4 pb-10 sm:px-6"
    >
      <header className="my-12 text-center">
        <span className="glass mb-3 inline-block rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-acc3 uppercase">
          the worlds
        </span>
        <h2 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink sm:text-3xl">
          Step inside the <span className="grad-text">living world</span>
        </h2>
        <p className="mt-2 text-sm text-dim">
          Real people, real nights — every conversation opens a door.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {WORLDS.map((w, i) => (
          <motion.article
            key={w.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.6,
              delay: (i % 4) * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`group overflow-hidden rounded-[22px] border border-white/12 bg-white/4 transition-[transform,box-shadow,border-color] duration-400 hover:-translate-y-2.5 hover:-rotate-1 hover:border-acc2/50 hover:shadow-[0_30px_70px_rgba(232,237,245,0.22)] ${w.span}`}
          >
            <div className="relative h-[200px] overflow-hidden">
              <Image
                src={w.src}
                alt={w.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                className="object-cover transition-transform duration-800 ease-out group-hover:scale-[1.12]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
              />
              <span className="absolute bottom-3 left-4 text-2xl drop-shadow-lg">{w.emoji}</span>
            </div>
            <div className="p-5">
              <h3 className="mb-1.5 font-display text-[15px] font-bold text-ink">{w.title}</h3>
              <p className="text-[13px] leading-relaxed text-dim">{w.desc}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
