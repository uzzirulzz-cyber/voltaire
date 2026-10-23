import { SiteNav } from "@/components/playbeat/site-nav";
import { Hero } from "@/components/playbeat/hero";
import { Studio } from "@/components/playbeat/studio";
import { Showcase } from "@/components/playbeat/showcase";
import { Capabilities } from "@/components/playbeat/capabilities";
import { Closing } from "@/components/playbeat/closing";

/**
 * PlayBeat AI — playbeatdigital.world
 * ComfyUI-node-graph-inspired AI chat app.
 * Single user-visible route: landing + Studio chat on one page.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-deep">
      <SiteNav />

      <main className="flex-1">
        <Hero />
        <Studio />
        <Showcase />
        <Capabilities />
        <Closing />
      </main>

      <footer className="mt-auto border-t border-silver/12 bg-navy-deep">
        <div
          className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-center text-[11.5px] text-silver/45 sm:px-6 md:flex-row md:text-left"
          style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <p>
            © 2026 PlayBeat AI · part of PlayBeat Digital —{" "}
            <span className="text-silver/60">playbeatdigital.world</span>
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Node graph inspired by ComfyUI</span>
            <span aria-hidden="true" className="text-gold/40">
              ·
            </span>
            <span>Made for your next big idea</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
