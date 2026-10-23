"use client";

import { useEffect, useRef } from "react";

/**
 * AuroraCanvas — the fixed, full-page living background.
 * Five large radial-gradient orbs (silver / yellow / amber / steel gray /
 * deep navy-slate) drift on independent sine paths with additive blending —
 * an aurora that breathes behind the whole site. Renders one static
 * frame under prefers-reduced-motion; pauses on hidden tabs.
 */

type Orb = {
  hue: [number, number, number];
  r: number; // radius in units of max(vw,vh)
  ux: number;
  uy: number;
  ax: number; // drift amplitude (fraction of w/h)
  ay: number;
  sx: number; // speed
  sy: number;
  phase: number;
  alpha: number;
};

const ORBS: Orb[] = [
  { hue: [214, 226, 242], r: 0.46, ux: 0.16, uy: 0.22, ax: 0.1, ay: 0.08, sx: 0.11, sy: 0.08, phase: 0.0, alpha: 0.15 },  // silver
  { hue: [250, 204, 21], r: 0.3, ux: 0.84, uy: 0.2, ax: 0.09, ay: 0.1, sx: 0.09, sy: 0.12, phase: 1.7, alpha: 0.11 },    // yellow
  { hue: [251, 191, 36], r: 0.24, ux: 0.62, uy: 0.86, ax: 0.12, ay: 0.06, sx: 0.07, sy: 0.1, phase: 3.1, alpha: 0.07 },    // amber
  { hue: [138, 152, 178], r: 0.34, ux: 0.12, uy: 0.88, ax: 0.08, ay: 0.09, sx: 0.13, sy: 0.07, phase: 4.4, alpha: 0.1 },    // steel gray
  { hue: [56, 78, 128], r: 0.5, ux: 0.5, uy: 0.55, ax: 0.07, ay: 0.07, sx: 0.05, sy: 0.06, phase: 2.3, alpha: 0.16 },       // deep navy-slate
];

export function AuroraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (ms: number) => {
      const t = ms / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const m = Math.max(w, h);
      for (const o of ORBS) {
        const x = (o.ux + Math.sin(t * o.sx + o.phase) * o.ax) * w;
        const y = (o.uy + Math.cos(t * o.sy + o.phase * 1.3) * o.ay) * h;
        const r = o.r * m * (1 + 0.08 * Math.sin(t * 0.2 + o.phase));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const [cr, cg, cb] = o.hue;
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${o.alpha})`);
        g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${o.alpha * 0.4})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (time: number) => {
      if (!document.hidden) draw(time);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 -z-20 h-screen w-screen"
    />
  );
}
