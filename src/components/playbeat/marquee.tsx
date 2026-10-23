"use client";

/**
 * Marquee — the tilted infinite ticker "ASK ✦ BUILD ✦ GROOVE ✦ REPEAT".
 * Track duplicated twice; translateX(-50%) loops seamlessly.
 */
export function Marquee() {
  const phrase =
    "ASK ✦ BUILD ✦ GROOVE ✦ REPEAT ✦ ASK ✦ BUILD ✦ GROOVE ✦ REPEAT ✦ ASK ✦ BUILD ✦ GROOVE ✦ REPEAT ✦ ";
  return (
    <div
      aria-hidden="true"
      className="relative z-10 my-8 -rotate-[1.2deg] scale-[1.02] overflow-hidden border-y border-white/12 bg-white/2 py-4"
    >
      <div className="pb-marquee-track">
        <span className="pr-4 font-display text-xl font-bold tracking-[0.2em] whitespace-nowrap text-transparent md:text-2xl [background:linear-gradient(90deg,#a78bfa,#f472b6,#fbbf24)] [-webkit-background-clip:text] [background-clip:text] sm:text-2xl">
          {phrase}
        </span>
        <span className="pr-4 font-display text-xl font-bold tracking-[0.2em] whitespace-nowrap text-transparent md:text-2xl [background:linear-gradient(90deg,#a78bfa,#f472b6,#fbbf24)] [-webkit-background-clip:text] [background-clip:text] sm:text-2xl">
          {phrase}
        </span>
      </div>
    </div>
  );
}
