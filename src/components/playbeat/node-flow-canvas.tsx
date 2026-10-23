"use client";

import { useEffect, useRef } from "react";

/**
 * NodeFlowCanvas — an ambient ComfyUI/litegraph-style node graph.
 *
 * Dark navy canvas with a faint dot grid, drifting rounded nodes
 * (colored header bars, ports, body lines), bezier wires with
 * litegraph tangents, glowing pulses traveling along the wires,
 * and periodic "execution" flashes. Paused on hidden tabs,
 * single static frame under prefers-reduced-motion.
 */

type GNode = {
  ux: number; // unit x (0..1)
  uy: number; // unit y (0..1)
  w: number;
  h: number;
  title: string;
  color: string;
  phase: number;
  speed: number;
  amp: number;
  kind: "lines" | "slider" | "toggle";
};

type Edge = { a: number; b: number; speed: number; offset: number; hue: string };

const NODE_COLORS = ["#e8edf5", "#facc15", "#fbbf24", "#96a0b4"];
const WIRE_HUES = ["#e8edf5", "#facc15", "#fbbf24", "#96a0b4"];

const NODE_TITLES = [
  "PlayBeat Prompt",
  "Load Beat",
  "CLIP Encode",
  "Audio Router",
  "KIMI Core",
  "KSampler",
  "VAE Decode",
  "Preview Image",
  "Stage Lights",
  "Set Arc",
  "Waveform Mix",
  "Brand Voice",
  "Press Kit",
  "Flyer Render",
  "Master Bus",
  "Deliver",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph(): { nodes: GNode[]; edges: Edge[] } {
  const rand = mulberry32(20260214);
  const nodes: GNode[] = NODE_TITLES.map((title, i) => ({
    ux: 0.04 + rand() * 0.92,
    uy: 0.05 + rand() * 0.9,
    w: 96 + Math.round(rand() * 46),
    h: 52 + Math.round(rand() * 18),
    title,
    color: NODE_COLORS[i % NODE_COLORS.length],
    phase: rand() * Math.PI * 2,
    speed: 0.25 + rand() * 0.4,
    amp: 5 + rand() * 8,
    kind:
      rand() < 0.3 ? "slider" : rand() < 0.5 ? "toggle" : "lines",
  }));

  // Wire each node to 1–2 nodes that sit to its right (graph "flow").
  const edges: Edge[] = [];
  nodes.forEach((n, i) => {
    const right = nodes
      .map((m, j) => ({ j, d: m.ux - n.ux }))
      .filter((o) => o.d > 0.08 && o.d < 0.45)
      .sort((a, b) => a.d - b.d);
    const count = 1 + (rand() < 0.35 ? 1 : 0);
    for (let k = 0; k < count && k < right.length; k++) {
      edges.push({
        a: i,
        b: right[k].j,
        speed: 0.0022 + rand() * 0.0035,
        offset: rand(),
        hue: WIRE_HUES[Math.floor(rand() * WIRE_HUES.length)],
      });
    }
  });
  return { nodes, edges };
}

function bezPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function NodeFlowCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { nodes, edges } = buildGraph();

    // Resolve the Space Grotesk font stack registered by next/font.
    let displayFont = "system-ui, sans-serif";
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--font-space");
      if (v && v.trim().length > 2) displayFont = v.trim();
    } catch {
      /* keep fallback */
    }

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const nodePos = (n: GNode, t: number): [number, number] => [
      n.ux * w,
      n.uy * h + Math.sin(t * n.speed + n.phase) * n.amp,
    ];

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);

      // ── dot grid ──────────────────────────────────────────────
      const gap = 26;
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      for (let x = gap / 2; x < w; x += gap) {
        for (let y = gap / 2; y < h; y += gap) {
          ctx.fillRect(x, y, 1.4, 1.4);
        }
      }

      // ── wires ─────────────────────────────────────────────────
      const pos = nodes.map((n) => nodePos(n, t));
      ctx.lineWidth = 1.4;
      for (const e of edges) {
        const [ax, ay] = pos[e.a];
        const [bx, by] = pos[e.b];
        const a = nodes[e.a];
        const b = nodes[e.b];
        const x1 = ax + a.w;
        const y1 = ay + a.h * 0.62;
        const x2 = bx;
        const y2 = by + b.h * 0.3;
        const dx = Math.max(38, Math.abs(x2 - x1) * 0.5);
        ctx.strokeStyle = "rgba(255,255,255,0.11)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
        ctx.stroke();
      }

      // ── pulses ────────────────────────────────────────────────
      for (const e of edges) {
        const p = (t * e.speed * 60 + e.offset) % 1;
        const [ax, ay] = pos[e.a];
        const [bx, by] = pos[e.b];
        const a = nodes[e.a];
        const b = nodes[e.b];
        const x1 = ax + a.w;
        const y1 = ay + a.h * 0.62;
        const x2 = bx;
        const y2 = by + b.h * 0.3;
        const dx = Math.max(38, Math.abs(x2 - x1) * 0.5);
        const px = bezPoint(p, x1, x1 + dx, x2 - dx, x2);
        const py = bezPoint(p, y1, y1, y2, y2);
        const fade = Math.sin(p * Math.PI); // ease in/out
        ctx.save();
        ctx.globalAlpha = 0.25 + fade * 0.75;
        ctx.shadowColor = e.hue;
        ctx.shadowBlur = 10;
        ctx.fillStyle = e.hue;
        ctx.beginPath();
        ctx.arc(px, py, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── nodes ─────────────────────────────────────────────────
      const glowIndex = Math.floor(t / 1.9) % nodes.length;
      nodes.forEach((n, i) => {
        const [x, y] = pos[i];
        const glowing = i === glowIndex && t % 1.9 < 0.55;
        const glow = glowing ? Math.sin(((t % 1.9) / 0.55) * Math.PI) : 0;

        ctx.save();
        if (glow > 0) {
          ctx.shadowColor = "rgba(250,204,21,0.55)";
          ctx.shadowBlur = 26 * glow;
        }

        // body
        ctx.beginPath();
        ctx.roundRect(x, y, n.w, n.h, 9);
        ctx.fillStyle = "rgba(16,26,46,0.85)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle =
          glow > 0
            ? `rgba(250,204,21,${0.45 + glow * 0.4})`
            : "rgba(255,255,255,0.16)";
        ctx.stroke();

        // header bar
        ctx.beginPath();
        ctx.roundRect(x, y, n.w, 15, [9, 9, 0, 0]);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;

        // header title
        ctx.fillStyle = "#0a0f1c";
        ctx.font = `700 8.5px ${displayFont}`;
        ctx.textBaseline = "middle";
        ctx.fillText(n.title, x + 7, y + 8.5, n.w - 14);

        // body contents
        if (n.kind === "lines") {
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          for (let l = 0; l < 3; l++) {
            ctx.beginPath();
            ctx.roundRect(x + 8, y + 24 + l * 9, (n.w - 20) * (0.9 - l * 0.22), 3, 2);
            ctx.fill();
          }
        } else if (n.kind === "slider") {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.roundRect(x + 8, y + 30, n.w - 16, 3, 2);
          ctx.fill();
          const fill = 0.35 + 0.3 * Math.sin(t * 0.6 + n.phase);
          ctx.fillStyle = n.color;
          ctx.beginPath();
          ctx.roundRect(x + 8, y + 30, (n.w - 16) * fill, 3, 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 8 + (n.w - 16) * fill, y + 31.5, 3.4, 0, Math.PI * 2);
          ctx.fillStyle = "#f7f9fc";
          ctx.fill();
        } else {
          // toggle widget
          const on = Math.sin(t * 0.8 + n.phase) > 0;
          ctx.beginPath();
          ctx.roundRect(x + 8, y + 24, 22, 12, 6);
          ctx.fillStyle = on ? n.color : "rgba(255,255,255,0.14)";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + (on ? 25 : 13), y + 30, 4, 0, Math.PI * 2);
          ctx.fillStyle = on ? "#0a0f1c" : "#f7f9fc";
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.beginPath();
          ctx.roundRect(x + 36, y + 27, n.w - 48, 3, 2);
          ctx.fill();
        }

        // ports
        ctx.fillStyle = "#0a0f1c";
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y + n.h * 0.62, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + n.w, y + n.h * 0.62, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    };

    const loop = (time: number) => {
      if (!document.hidden) draw(time);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(parent);

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ opacity: 0.85 }}
    />
  );
}
