"use client";

import { useEffect, useRef } from "react";

/** ScrollProgress — 3px gradient bar that tracks page scroll. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      el.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="fixed top-0 left-0 z-[60] h-[3px] w-0"
      style={{
        background: "linear-gradient(90deg, #e8edf5, #facc15 50%, #f7f9fc)",
        boxShadow: "0 0 12px rgba(250,204,21,.8)",
      }}
    />
  );
}
