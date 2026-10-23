"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

const LINKS = [
  { href: "#flow", label: "Flow" },
  { href: "#studio", label: "Studio" },
  { href: "#gallery", label: "Gallery" },
  { href: "#capabilities", label: "Capabilities" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-silver/12 bg-navy-deep/80 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <a href="#flow" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-silver font-display text-sm font-extrabold text-navy-deep shadow-[0_4px_18px_rgba(227,178,60,0.35)]">
            P
          </span>
          <span className="font-display text-[15px] font-bold text-silver-lt">
            PlayBeat AI
          </span>
          <span className="hidden text-[11px] text-silver/40 lg:inline">
            playbeatdigital.world
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-silver/70 transition-colors hover:text-gold-lt"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#studio"
          className="pb-gold-btn flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-[13px] font-bold"
        >
          <Play className="h-3.5 w-3.5" fill="currentColor" />
          Start creating
        </a>
      </nav>
    </header>
  );
}
