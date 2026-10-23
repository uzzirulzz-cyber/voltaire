"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth-provider";

/**
 * AuthModal — sign in / sign up (email + password → server session cookie).
 * Their reference uses a Bootstrap 5 modal + nav-pills; this is the
 * shadcn/ui equivalent, styled to the same glass/gradient language.
 */
export function AuthModal() {
  const { authOpen, closeAuth, mode, setMode, signup, login, user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  /* reset form whenever the modal (re)opens or switches mode */
  useEffect(() => {
    setError("");
  }, [authOpen, mode]);

  /* close automatically once signed in */
  useEffect(() => {
    if (user && authOpen) {
      toast({
        title: isSignup ? `Welcome, ${user.name}` : `Welcome back, ${user.name}`,
        description: "The studio is yours — sessions are saved to your account.",
      });
      closeAuth();
      setName("");
      setPassword("");
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      if (isSignup) await signup(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={authOpen} onOpenChange={(o) => (o ? undefined : closeAuth())}>
      <DialogContent
        className="glass w-[calc(100%-2rem)] max-w-[400px] rounded-3xl border-white/14 bg-[rgba(18,16,30,0.92)] p-0 backdrop-blur-2xl [box-shadow:0_40px_100px_rgba(0,0,0,.7),0_0_60px_rgba(167,139,250,.15)]"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-center font-display text-lg font-bold text-ink">
            Welcome to PlayBeat
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="px-6 pb-6">
          {/* mode pills */}
          <div className="mb-4 flex rounded-xl bg-white/6 p-1" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={[
                  "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  mode === m
                    ? "bg-gradient-to-r from-acc1 to-acc2 text-void"
                    : "text-dim hover:text-ink",
                ].join(" ")}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {isSignup && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              type="text"
              placeholder="Display name"
              autoComplete="name"
              className="mb-3 w-full rounded-xl border border-white/14 bg-black/35 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-dim focus:border-acc1 focus:ring-[3px] focus:ring-acc1/20"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            className="mb-3 w-full rounded-xl border border-white/14 bg-black/35 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-dim focus:border-acc1 focus:ring-[3px] focus:ring-acc1/20"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={isSignup ? 8 : 1}
            placeholder={isSignup ? "Password (8+ chars)" : "Password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="mb-4 w-full rounded-xl border border-white/14 bg-black/35 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-dim focus:border-acc1 focus:ring-[3px] focus:ring-acc1/20"
          />

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/12 px-4 py-2.5 text-[13px] text-rose-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="pb-grad-btn sheen flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-dim">
            🔒 scrypt-hashed passwords · HMAC-signed session cookies — your
            account stays on this server.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
