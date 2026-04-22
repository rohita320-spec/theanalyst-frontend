"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout } from "../lib/api";

type Props = {
  active: "home" | "feed" | "leaderboard" | "profile";
  pointsBalance?: number;
  showPointsBalance?: boolean;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

type AuthNotice = {
  tone: "success" | "warning";
  message: string;
};

function readStoredAuth() {
  if (typeof window === "undefined") {
    return { email: null, role: null };
  }

  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) {
      return { email: null, role: null };
    }
    const user = JSON.parse(raw) as { email?: string; role?: string };
    return {
      email: user.email || null,
      role: user.role || null,
    };
  } catch {
    return { email: null, role: null };
  }
}

export default function AppHeader({ active, pointsBalance = 0, showPointsBalance = true }: Props) {
  const [authState, setAuthState] = useState<{ email: string | null; role: string | null }>(() => readStoredAuth());
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    const syncAuth = () => {
      setAuthState(readStoredAuth());
    };

    const syncNotice = () => {
      try {
        const raw = sessionStorage.getItem("auth_notice");
        if (!raw) return;

        const parsed = JSON.parse(raw) as { tone?: "success" | "warning"; message?: string };
        if (parsed?.message) {
          setNotice({
            tone: parsed.tone === "warning" ? "warning" : "success",
            message: parsed.message,
          });
        }
        sessionStorage.removeItem("auth_notice");
      } catch {
        sessionStorage.removeItem("auth_notice");
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "auth_token" || event.key === "auth_user") {
        syncAuth();
      }
    };

    const onAuthChanged = () => {
      syncAuth();
      syncNotice();
    };

    syncNotice();
  syncAuth();
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(id);
  }, [notice]);

  const authEmail = authState.email;
  const authRole = authState.role;

  const handleLogout = async () => {
    const token = localStorage.getItem("auth_token") || "";
    try {
      await logout(token || undefined);
    } catch {
      // Ignore network failures; still clear local session.
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    document.cookie = "ta_session=; path=/; max-age=0; samesite=lax";
    sessionStorage.setItem("auth_notice", JSON.stringify({ tone: "warning", message: "Logged out successfully." }));
    window.dispatchEvent(new Event("auth-changed"));
    setAuthState({ email: null, role: null });
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[#0a1120]/80 backdrop-blur-xl">
      {notice && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
          <div
            className={`rounded-xl border px-4 py-2 text-sm ${
              notice.tone === "success"
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                : "border-amber-400/35 bg-amber-500/10 text-amber-200"
            }`}
          >
            {notice.message}
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">The Analyst</p>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">High-Signal Analysis Feed</h1>
        </div>

        <nav className="grid w-full grid-cols-4 gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-1 md:flex md:w-auto md:items-center">
          <Link
            href="/"
            className={`app-nav-link rounded-lg px-3 py-2 text-center text-sm transition-colors ${active === "home" ? "app-nav-link-active" : "text-slate-300 hover:text-white"}`}
          >
            Landing
          </Link>
          <Link
            href="/feed"
            className={`app-nav-link rounded-lg px-3 py-2 text-center text-sm transition-colors ${active === "feed" ? "app-nav-link-active" : "text-slate-300 hover:text-white"}`}
          >
            Feed
          </Link>
          <Link
            href="/leaderboard"
            className={`app-nav-link rounded-lg px-3 py-2 text-center text-sm transition-colors ${active === "leaderboard" ? "app-nav-link-active" : "text-slate-300 hover:text-white"}`}
          >
            Leaderboard
          </Link>
          <Link
            href="/profile"
            className={`app-nav-link rounded-lg px-3 py-2 text-center text-sm transition-colors ${active === "profile" ? "app-nav-link-active" : "text-slate-300 hover:text-white"}`}
          >
            My Profile
          </Link>
          {(authRole === "admin" || authRole === "question_creator") && (
            <Link
              href="/admin"
              className="admin-menu-link rounded-lg px-3 py-2 text-center text-sm transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {showPointsBalance && (
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-2 text-left sm:text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Points Balance</p>
              <p className="text-lg font-semibold text-[var(--brand)]">{fmt(pointsBalance)}</p>
            </div>
          )}

          {authEmail ? (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)]/20 text-xs font-semibold text-[var(--brand)]">
                {authEmail.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-[120px] truncate text-xs font-medium text-white">{authEmail}</p>
                {authRole && (
                  <p className="text-[10px] capitalize text-slate-400">{authRole}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 text-xs text-slate-400 hover:text-white"
                title="Logout"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
