"use client";

import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth-provider";

const LINKS = [
  { href: "#studio", label: "Chat" },
  { href: "#worlds", label: "Worlds" },
  { href: "#features", label: "Features" },
];

/** SiteNav — floating glass pill (their reference nav), EQ logo, auth area. */
export function SiteNav() {
  const { user, loading, openAuth, logout } = useAuth();
  const { toast } = useToast();

  const initials = (user?.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header
      className="fixed top-4 left-1/2 z-50 w-[min(920px,94vw)] -translate-x-1/2"
      style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
    >
      <nav
        aria-label="Main navigation"
        className="glass flex items-center justify-between rounded-2xl px-4 py-2.5"
      >
        <a href="#flow" className="flex items-center gap-2.5">
          <span className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="font-display text-[15px] font-bold tracking-[0.02em] text-ink">
            ◉ PlayBeat<span className="grad-text">Digital</span>
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] text-dim transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* auth area */}
        {loading ? (
          <span className="h-8 w-20 animate-pulse rounded-full bg-white/6" aria-label="Loading session" />
        ) : user ? (
          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/7 py-1 pr-2 pl-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-acc1 to-acc2 text-[10px] font-bold text-void"
            >
              {initials || "◉"}
            </span>
            <span className="hidden max-w-28 truncate text-[13px] font-medium text-ink sm:inline">
              {user.name}
            </span>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                await logout();
                toast({
                  title: "Signed out",
                  description: "See you at the next show.",
                });
              }}
              className="rounded-full p-1.5 text-dim transition-colors hover:bg-white/8 hover:text-acc2"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuth("signin")}
            className="pb-grad-btn rounded-full px-4 py-2 font-display text-[13px] font-bold"
          >
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
