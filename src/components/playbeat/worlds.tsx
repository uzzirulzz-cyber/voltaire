"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Worlds — the gallery as "worlds you step inside".
 * Hover: card lifts + tilts, image zooms 1.12 over 0.8s.
 */

const WORLDS = [
  {
    emoji: "🎛",
    title: "Producer's Den",
    desc: "Talk arrangements, mixdowns, and that perfect low end.",
    src: "/images/drum-stage.jpg",
    alt: "Live drum on stage under spotlights",
    span: "",
  },
  {
    emoji: "🌆",
    title: "Synthwave Nights",
    desc: "Retro-future ideas, neon hooks, midnight prototypes.",
    src: "/images/neon-portrait.jpg",
    alt: "Neon-lit portrait in night-club light",
    span: "",
  },
  {
    emoji: "🫧",
    title: "Liquid Chrome",
    desc: "Design brainstorms that melt into shape as you talk.",
    src: "/images/dj-headphones.jpg",
    alt: "DJ in headphones and sunglasses under stage lights",
    span: "",
  },
  {
    emoji: "🌌",
    title: "Aurora Mind",
    desc: "Deep questions under a sky that thinks in color.",
    src: "/images/dancing-silhouette.jpg",
    alt: "Silhouette of a dancer in blue haze",
    span: "",
  },
  {
    emoji: "🎬",
    title: "The Film Room",
    desc: "People playing with the beat — the VOLTAIRE cut lives here.",
    src: "/images/adobe-stage.jpg",
    alt: "Concert stage atmosphere with dramatic lighting",
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
          Step inside the <span className="grad-text">worlds</span>
        </h2>
        <p className="mt-2 text-sm text-dim">
          Every conversation opens a door. Pick a frequency.
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
