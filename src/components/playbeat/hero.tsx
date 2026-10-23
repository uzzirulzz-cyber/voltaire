"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { CountUp } from "./count-up";

/**
 * Hero — 2-col split (their reference): copy left, floating collage right.
 * The main card is the VOLTAIRE film (People Playing With The Beat),
 * muted autoplay with a sound toggle; photo cards float on independent
 * rhythms and tilt with cursor parallax (translate + transform compose,
 * so the CSS floaty animation keeps running underneath).
 */

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  const visualRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const visual = visualRef.current;
    if (!visual) return;
    const rect = visual.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    cardRefs.current.forEach((card) => {
      if (!card) return;
      const depth = Number(card.dataset.depth ?? 20);
      card.style.transform = `translate3d(${(-mx * depth).toFixed(1)}px, ${(-my * depth).toFixed(1)}px, 0)`;
    });
  };

  const onLeave = () => {
    cardRefs.current.forEach((card) => {
      if (card) card.style.transform = "translate3d(0,0,0)";
    });
  };

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setSoundOn(!v.muted);
    if (!v.muted) void v.play().catch(() => undefined);
  };

  return (
    <section
      id="flow"
      className="relative z-10 mx-auto grid w-full max-w-[1200px] scroll-mt-24 grid-cols-1 items-center gap-10 px-4 pt-32 pb-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pt-36"
    >
      {/* ── copy ─────────────────────────────────────────────── */}
      <div className="text-center lg:text-left">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-acc3 uppercase"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acc3" />
          live — AI co-pilot
        </motion.span>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.12}
          className="font-display text-[clamp(2.4rem,5.2vw,4.6rem)] leading-[1.02] font-bold tracking-[-0.02em] text-ink"
        >
          Talk to the
          <br />
          <span className="grad-text">beat of your ideas.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.24}
          className="mx-auto mt-6 max-w-[560px] text-[1.05rem] leading-[1.7] text-dim lg:mx-0"
        >
          An AI chatbox that feels like a late-night studio session — warm,
          fast, and always in your corner. Ask anything. Build anything.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.36}
          className="mt-9 flex flex-wrap justify-center gap-3.5 lg:justify-start"
        >
          <a
            href="#studio"
            className="pb-grad-btn sheen flex items-center gap-2 rounded-2xl px-7 py-3.5 font-display text-[15px] font-bold"
          >
            Start chatting ↓
          </a>
          <a
            href="#worlds"
            className="glass flex items-center gap-2 rounded-2xl px-7 py-3.5 font-display text-[15px] font-semibold text-ink transition-all hover:border-acc1/40 hover:text-acc1"
          >
            Explore the vibe
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.5}
          className="mt-11 flex flex-wrap justify-center gap-x-10 gap-y-4 lg:justify-start"
        >
          {[
            { target: 24, suffix: "/7", label: "online" },
            { target: 128, suffix: "k", label: "conversations" },
            { target: 99, suffix: "%", label: "good vibes" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <CountUp target={s.target} suffix={s.suffix} />
              <span className="mt-0.5 text-[13px] tracking-[0.05em] text-dim">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── floating collage ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0.3}
        ref={visualRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative mx-auto h-[420px] w-full max-w-[520px] [perspective:1200px] lg:h-[560px] lg:max-w-none"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* glow orb */}
        <div
          aria-hidden="true"
          className="absolute inset-[10%_5%] -z-10 blur-[50px]"
          style={{
            background:
              "radial-gradient(circle, rgba(250,204,21,.32), rgba(232,237,245,.14) 55%, transparent 75%)",
          }}
        />

        {/* main — the VOLTAIRE film */}
        <div
          ref={(el) => {
            cardRefs.current[0] = el;
          }}
          data-depth="18"
          className="float-slow absolute top-[8%] left-[8%] z-1 h-[70%] w-[78%] -rotate-3 overflow-hidden rounded-[20px] border border-white/12 bg-panel [box-shadow:0_30px_70px_rgba(0,0,0,.6)] [transition:transform_.18s_ease-out] [transform-style:preserve-3d] will-change-transform"
        >
          <video
            ref={videoRef}
            src="/media/voltaire-beat.mp4"
            poster="/media/voltaire-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/12 bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-ink uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acc2" />
            film
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute film" : "Unmute film"}
            className="absolute right-3 bottom-12 flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-black/60 text-ink backdrop-blur-sm transition-all hover:border-acc2/50 hover:text-acc2"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <span className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-7 pb-3 text-[11px] tracking-[0.1em] text-dim uppercase">
            the soundscape layer — VOLTAIRE
          </span>
        </div>

        {/* a — studio mode */}
        <div
          ref={(el) => {
            cardRefs.current[1] = el;
          }}
          data-depth="34"
          className="float-med absolute top-0 right-[-2%] z-2 h-[38%] w-[46%] rotate-5 overflow-hidden rounded-[20px] border border-white/12 bg-panel [box-shadow:0_30px_70px_rgba(0,0,0,.6)] [transition:transform_.18s_ease-out] [transform-style:preserve-3d] will-change-transform"
        >
          <Image
            src="/images/neon-portrait.jpg"
            alt="Neon-lit studio mode"
            fill
            sizes="(max-width: 1024px) 40vw, 260px"
            className="object-cover"
          />
          <span className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-7 pb-3 text-[11px] tracking-[0.1em] text-dim uppercase">
            studio mode
          </span>
        </div>

        {/* b — headline mode */}
        <div
          ref={(el) => {
            cardRefs.current[2] = el;
          }}
          data-depth="26"
          className="float-fast absolute right-[4%] bottom-[2%] z-2 h-[34%] w-[44%] -rotate-6 overflow-hidden rounded-[20px] border border-white/12 bg-panel [box-shadow:0_30px_70px_rgba(0,0,0,.6)] [transition:transform_.18s_ease-out] [transform-style:preserve-3d] will-change-transform"
        >
          <Image
            src="/images/dj-headphones.jpg"
            alt="Headliner mode"
            fill
            sizes="(max-width: 1024px) 40vw, 260px"
            className="object-cover"
          />
          <span className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-7 pb-3 text-[11px] tracking-[0.1em] text-dim uppercase">
            headline mode
          </span>
        </div>
      </motion.div>
    </section>
  );
}
