import { SiteNav } from "@/components/playbeat/site-nav";
import { ScrollProgress } from "@/components/playbeat/scroll-progress";
import { AuroraCanvas } from "@/components/playbeat/aurora-canvas";
import { AuthModal } from "@/components/playbeat/auth-modal";
import { Hero } from "@/components/playbeat/hero";
import { Marquee } from "@/components/playbeat/marquee";
import { Worlds } from "@/components/playbeat/worlds";
import { ModelBots } from "@/components/playbeat/model-bots";
import { Studio } from "@/components/playbeat/studio";
import { Features } from "@/components/playbeat/features";
import { Closing } from "@/components/playbeat/closing";

/**
 * PlayBeat Digital — playbeatdigital.world
 * "AI that grooves with you" — vivid live-motion landing + chatbox.
 * Layering: body canvas bg → aurora (z-20) → grain (z-1) → content → nav (50) → progress (60).
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ambient layers (fixed) */}
      <AuroraCanvas />
      <div className="film-grain" aria-hidden="true" />

      <ScrollProgress />
      <SiteNav />
      <AuthModal />

      <main className="flex-1">
        <Hero />
        <Marquee />
        <Worlds />
        <ModelBots />
        <Studio />
        <Features />
        <Closing />
      </main>

      <footer className="mt-auto border-t border-white/12 bg-black/20">
        <div
          className="mx-auto flex w-[min(920px,92vw)] flex-col items-center justify-between gap-2 px-4 py-7 text-center text-[13px] text-dim sm:px-6 md:flex-row md:text-left"
          style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <span className="font-medium text-ink/80">playbeatdigital.world</span>
          <span className="text-dim/70">made with ♥ and too much coffee</span>
        </div>
      </footer>
    </div>
  );
}
