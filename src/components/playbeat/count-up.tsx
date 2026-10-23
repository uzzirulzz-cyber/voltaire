"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CountUp — animates 0 → target when scrolled into view.
 * Uses rAF with easeOutCubic; honors reduced motion (jumps to value).
 */
export function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      if (reduced) {
        setValue(target);
        return;
      }
      const t0 = performance.now();
      const dur = 1600;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <strong
      ref={ref}
      className="font-display text-3xl font-bold text-transparent [background:linear-gradient(90deg,#f7f9fc,#facc15)] [-webkit-background-clip:text] [background-clip:text]"
    >
      {value}
      {suffix}
    </strong>
  );
}
