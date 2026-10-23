"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Lock, MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth-provider";
import {
  firebaseErrorMessage,
  phoneConfirmCode,
  phoneSendCode,
  socialSignIn,
  type ConfirmationResult,
  type SocialProvider,
} from "@/lib/firebase";

/**
 * AuthModal — sign in / sign up, five ways (Task 27):
 *
 *   1. Email + password (scrypt on this server — original flow)
 *   2. Google          ┐
 *   3. GitHub          ├─ Firebase Auth popups → ID token → /api/auth/firebase
 *   4. Facebook        ┘
 *   5. Phone / SMS     — reCAPTCHA + SMS code, then the same exchange
 *
 * Their reference uses a Bootstrap 5 modal + nav-pills; this is the
 * shadcn/ui equivalent, styled to the same glass/gradient language.
 */

/* DOM id of the invisible reCAPTCHA container (Firebase phone flow). */
const RECAPTCHA_ID = "pb-recaptcha";

/* Brand marks — inline so they ride along with the bundle. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/** Shared button chrome for the federated options. */
function socialBtnClasses(active: boolean) {
  return [
    "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
    "disabled:cursor-not-allowed disabled:opacity-60",
    active
      ? "border-acc1/60 bg-acc1/10 text-ink"
      : "border-white/14 bg-black/35 text-ink hover:border-acc1/50 hover:bg-black/50",
  ].join(" ");
}

export function AuthModal() {
  const { authOpen, closeAuth, mode, setMode, signup, login, firebaseLogin, user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  /* Federated (Firebase) state */
  const [view, setView] = useState<"email" | "phone">("email");
  const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
  const [phone, setPhone] = useState("");
  const [phonePending, setPhonePending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  /* Bumping this key re-mounts the reCAPTCHA container for a fresh widget. */
  const [captchaKey, setCaptchaKey] = useState(0);

  const isSignup = mode === "signup";

  /* reset transient state whenever the modal (re)opens */
  useEffect(() => {
    if (authOpen) {
      setError("");
      setView("email");
      resetPhoneFlow(false);
    }
  }, [authOpen]);

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

  /** Wipe the phone/SMS flow (optionally keeping the typed number). */
  const resetPhoneFlow = (keepNumber: boolean) => {
    setCodeSent(false);
    setOtp("");
    setPhonePending(false);
    confirmationRef.current = null;
    setCaptchaKey((k) => k + 1);
    if (!keepNumber) setPhone("");
  };

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

  /* Google / GitHub / Facebook popup → ID token → session cookie */
  const handleSocial = async (provider: SocialProvider) => {
    if (socialPending) return;
    setError("");
    setSocialPending(provider);
    try {
      const idToken = await socialSignIn(provider);
      await firebaseLogin(idToken);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setSocialPending(null);
    }
  };

  /** "+1 555 123 4567" (or "5551234567" → US default) → "+15551234567" */
  const normalizePhone = (raw: string): string | null => {
    const cleaned = raw.replace(/[\s\-().]/g, "");
    if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
    if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
    return null;
  };

  /* Phone step 1 — send the SMS code (renders the invisible reCAPTCHA). */
  const handleSendCode = async () => {
    if (phonePending) return;
    setError("");
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Enter a valid phone number with country code, e.g. +1 555 123 4567.");
      return;
    }
    setPhonePending(true);
    try {
      confirmationRef.current = await phoneSendCode(normalized, RECAPTCHA_ID);
      setCodeSent(true);
      setOtp("");
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setCaptchaKey((k) => k + 1); // fresh widget for the retry
    } finally {
      setPhonePending(false);
    }
  };

  /* Phone step 2 — confirm the 6-digit code. */
  const handleVerifyCode = async () => {
    if (phonePending || !confirmationRef.current) return;
    setError("");
    setPhonePending(true);
    try {
      const idToken = await phoneConfirmCode(confirmationRef.current, otp);
      await firebaseLogin(idToken);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setPhonePending(false);
    }
  };

  return (
    <Dialog open={authOpen} onOpenChange={(o) => (o ? undefined : closeAuth())}>
      <DialogContent
        aria-describedby={undefined}
        className="glass max-h-[92dvh] overflow-y-auto rounded-3xl border-white/14 bg-[rgba(10,15,28,0.92)] p-0 backdrop-blur-2xl [box-shadow:0_40px_100px_rgba(0,0,0,.7),0_0_60px_rgba(250,204,21,.14)] w-[calc(100%-2rem)] max-w-[400px]"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-center font-display text-lg font-bold text-ink">
            Welcome to PlayBeat
          </DialogTitle>
        </DialogHeader>

        {view === "email" ? (
          <form
            onSubmit={submit}
            className="px-6 pb-6"
            aria-label="Email and password sign in"
          >
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
                className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/12 px-4 py-2.5 text-[13px] leading-relaxed text-rose-300"
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

            {/* ── federated options ─────────────────────────────── */}
            <div
              className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-dim"
              aria-hidden="true"
            >
              <span className="h-px flex-1 bg-white/12" />
              or continue with
              <span className="h-px flex-1 bg-white/12" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSocial("google")}
                disabled={socialPending !== null}
                aria-label="Continue with Google"
                className={socialBtnClasses(socialPending === "google")}
              >
                {socialPending === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocial("github")}
                disabled={socialPending !== null}
                aria-label="Continue with GitHub"
                className={socialBtnClasses(socialPending === "github")}
              >
                {socialPending === "github" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GithubMark />
                )}
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleSocial("facebook")}
                disabled={socialPending !== null}
                aria-label="Continue with Facebook"
                className={socialBtnClasses(socialPending === "facebook")}
              >
                {socialPending === "facebook" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FacebookMark />
                )}
                Facebook
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  resetPhoneFlow(true);
                  setView("phone");
                }}
                disabled={socialPending !== null}
                aria-label="Continue with phone SMS"
                className={socialBtnClasses(false)}
              >
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                Phone / SMS
              </button>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-dim">
              Email &amp; password are scrypt-hashed on this server · Google,
              GitHub, Facebook &amp; Phone sign-ins are verified by Firebase.
            </p>
          </form>
        ) : (
          /* ── Phone / SMS view ──────────────────────────────────── */
          <div className="px-6 pb-6" aria-label="Phone SMS sign in">
            <button
              type="button"
              onClick={() => {
                setError("");
                resetPhoneFlow(true);
                setView("email");
              }}
              className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-dim transition-colors hover:text-acc1"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to email
            </button>

            {!codeSent ? (
              <>
                <p className="mb-3 text-sm leading-relaxed text-dim">
                  We&apos;ll text you a 6-digit code. Enter your number with
                  country code — e.g. <span className="text-ink">+1 555 123 4567</span>.
                </p>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  aria-label="Phone number"
                  className="mb-4 w-full rounded-xl border border-white/14 bg-black/35 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-dim focus:border-acc1 focus:ring-[3px] focus:ring-acc1/20"
                />
                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/12 px-4 py-2.5 text-[13px] leading-relaxed text-rose-300"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={phonePending}
                  className="pb-grad-btn sheen flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold"
                >
                  {phonePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                  )}
                  Send code
                </button>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm leading-relaxed text-dim">
                  Code sent to <span className="text-ink">{phone}</span> — enter
                  the 6 digits from the SMS.
                </p>
                <div className="mb-4 flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                    aria-label="6 digit SMS code"
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 w-10 border-white/14 bg-black/35 text-lg font-bold text-ink"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/12 px-4 py-2.5 text-[13px] leading-relaxed text-rose-300"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={phonePending || otp.length !== 6}
                  className="pb-grad-btn sheen flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold"
                >
                  {phonePending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify &amp; sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    resetPhoneFlow(true); // keep the number, fresh reCAPTCHA
                  }}
                  className="mt-3 w-full text-center text-xs font-semibold text-dim transition-colors hover:text-acc1"
                >
                  Didn&apos;t get the code? Resend
                </button>
              </>
            )}

            {/* Invisible reCAPTCHA mounts here (Firebase requirement). */}
            <div key={captchaKey} id={RECAPTCHA_ID} />
            <p className="mt-4 text-center text-[11px] leading-relaxed text-dim">
              Phone sign-in is protected by reCAPTCHA — verified by Firebase.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
