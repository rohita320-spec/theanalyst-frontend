"use client";

import Link from "next/link";

type Props = {
  active: "feed" | "leaderboard" | "profile";
  pointsBalance?: number;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function AppHeader({ active, pointsBalance = 0 }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[#0a1120]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">The Analyst</p>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">High-Signal Analysis Feed</h1>
        </div>

        <nav className="grid w-full grid-cols-3 gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-1 md:flex md:w-auto md:items-center">
          <Link
            href="/feed"
            className={`rounded-lg px-3 py-2 text-center text-sm ${active === "feed" ? "bg-[#16243c] text-white" : "text-slate-300"}`}
          >
            Feed
          </Link>
          <Link
            href="/leaderboard"
            className={`rounded-lg px-3 py-2 text-center text-sm ${active === "leaderboard" ? "bg-[#16243c] text-white" : "text-slate-300"}`}
          >
            Leaderboard
          </Link>
          <Link
            href="/profile"
            className={`rounded-lg px-3 py-2 text-center text-sm ${active === "profile" ? "bg-[#16243c] text-white" : "text-slate-300"}`}
          >
            My Profile
          </Link>
        </nav>

        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-left sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Points Balance</p>
          <p className="text-xl font-semibold text-[var(--brand)]">{fmt(pointsBalance)}</p>
        </div>
      </div>
    </header>
  );
}
