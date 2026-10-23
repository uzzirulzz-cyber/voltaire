"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthUser } from "./types";

/**
 * AuthProvider — session state for the whole app.
 * Talks to /api/auth/* (scrypt + HMAC cookie sessions — see worklog Task 8).
 * Owns the auth-modal open state so nav, hero, studio and CTA can all
 * trigger it with the right mode.
 */

type AuthMode = "signin" | "signup";

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  authOpen: boolean;
  mode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  setMode: (m: AuthMode) => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Exchange a client-minted Firebase ID token for the pb_session cookie. */
  firebaseLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");

  /* restore session on mount */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        }
      } catch {
        /* offline — stay signed out */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = useCallback((m?: AuthMode) => {
    if (m) setMode(m);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create your account.");
      setUser(data.user);
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not sign you in.");
    setUser(data.user);
  }, []);

  /* Task 27 — federated (Google / GitHub / Facebook / Phone) sign-in: the
     client SDK mints the Firebase ID token, this route verifies it and
     issues the same pb_session cookie as email+password login. */
  const firebaseLogin = useCallback(async (idToken: string) => {
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not sign you in.");
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* clear locally regardless */
    }
    setUser(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        authOpen,
        mode,
        openAuth,
        closeAuth,
        setMode,
        signup,
        login,
        firebaseLogin,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
