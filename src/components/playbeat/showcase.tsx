"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

/**
 * Showcase — the PlayBeat visual archive rendered as ComfyUI-style
 * "PreviewImage" nodes: header bar with node name, the photo, a
 * footer with port dots. Hover: gold glow + slow zoom.
 */

const ITEMS = [
  {
    src: "/images/dj-headphones.jpg",
    alt: "DJ wearing headphones and sunglasses under stage lights",
    label: "PreviewImage",
    node: "visual_sampler_01",
    title: "Headliner",
    tag: "6208 × 3136 · stage ready",
    span: "md:col-span-3",
    width: 1600,
    height: 808,
    priority: true,
  },
  {
    src: "/images/neon-portrait.jpg",
    alt: "Portrait of a young woman lit by neon lights at night",
    label: "PreviewImage",
    node: "visual_sampler_02",
    title: "Neon Face",
    tag: "night club palette",
    span: "md:col-span-3",
    width: 1200,
    height: 800,
    priority: true,
  },
  {
    src: "/images/dancing-silhouette.jpg",
    alt: "Silhouette of a gracefully dancing woman in blue haze and light smoke",
    label: "PreviewImage",
    node: "visual_sampler_03",
    title: "Blue Haze",
    tag: "silhouette study",
    span: "md:col-span-2",
    width: 1200,
    height: 800,
    priority: false,
  },
  {
    src: "/images/drum-stage.jpg",
    alt: "Live drum on stage with spotlights illuminating smoke at a concert",
    label: "PreviewImage",
    node: "visual_sampler_04",
    title: "Percussion",
    tag: "spotlights · smoke",
    span: "md:col-span-2",
    width: 1600,
    height: 897,
    priority: false,
  },
  {
    src: "/images/adobe-stage.jpg",
    alt: "Concert stage atmosphere with dramatic lighting",
    label: "PreviewImage",
    node: "visual_sampler_05",
    title: "Stagecraft",
    tag: "atmosphere plate",
    span: "md:col-span-2",
    width: 1000,
    height: 667,
    priority: false,
  },
];

export function Showcase() {
  return (
    <section
      id="gallery"
      className="relative z-10 scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/8 px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-gold-lt">
            THE GALLERY
          </span>
          <h2 className="font-display text-2xl font-bold text-silver-lt sm:text-3xl">
            Every frame, a <span className="text-gradient-gold">node output</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-silver/60">
            The PlayBeat archive — rendered like image previews straight off the
            graph. Hover a node to feel it execute.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {ITEMS.map((item, i) => (
            <motion.figure
              key={item.src}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: (i % 3) * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group overflow-hidden rounded-xl border border-silver/15 bg-navy-mid/40 transition-all duration-300 hover:border-gold/45 hover:shadow-[0_24px_60px_rgba(227,178,60,0.14)] ${item.span}`}
            >
              {/* node header */}
              <div className="flex items-center gap-2 border-b border-silver/12 bg-navy-deep/60 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-gold/80" />
                <span className="font-mono text-[10px] text-silver/55">
                  {item.label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-silver/35">
                  {item.node}
                </span>
              </div>

              {/* image */}
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "16 / 10" }}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                  priority={item.priority}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-40"
                />
                <span className="absolute right-3 top-3 flex h-7 w-7 translate-y-1 items-center justify-center rounded-lg border border-gold/40 bg-navy-deep/70 text-gold-lt opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <Eye className="h-3.5 w-3.5" />
                </span>
                <span className="absolute bottom-3 left-3 font-display text-sm font-bold text-silver-lt drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {item.title}
                </span>
              </div>

              {/* node footer w/ ports */}
              <div className="relative flex items-center justify-between border-t border-silver/12 bg-navy-deep/60 px-3 py-2">
                <span className="text-[10.5px] text-silver/45">{item.tag}</span>
                <span aria-hidden="true" className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full border border-silver/30 bg-navy-deep" />
                  <span className="h-2 w-2 rounded-full border border-gold/50 bg-navy-deep" />
                </span>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
