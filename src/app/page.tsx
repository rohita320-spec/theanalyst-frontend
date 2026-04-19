"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type FeedQuestion = {
  _id: string;
  title: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  entry_cost: number;
  closing_time?: string;
};

// ─── Demo data for the interactive simulation ────────────────────────────────
const DEMO_QUESTION = {
  title: "Will the Fed keep interest rates unchanged at their next meeting?",
  category: "Economy",
  yes_percent: 62,
  no_percent: 38,
  entry_cost: 300,
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProbBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
      <div className="bg-emerald-400 transition-all duration-700" style={{ width: `${yes}%` }} />
      <div className="bg-orange-400 transition-all duration-700" style={{ width: `${no}%` }} />
    </div>
  );
}

export default function LandingPage() {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Demo state
  const [demoVote, setDemoVote] = useState<"yes" | "no" | null>(null);
  const [demoYes, setDemoYes] = useState(DEMO_QUESTION.yes_percent);
  const [demoNo, setDemoNo] = useState(DEMO_QUESTION.no_percent);
  const [demoAnimating, setDemoAnimating] = useState(false);
  const [demoResolved, setDemoResolved] = useState(false);
  const [demoResolvedOutcome, setDemoResolvedOutcome] = useState<"win" | "loss" | null>(null);

  useEffect(() => {
    // Try to load real open questions from the API
    fetch(`${API_BASE}/feed_questions?limit=6&status=open`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.results?.length) setQuestions(body.results.slice(0, 6));
      })
      .catch(() => {
        // silently ignore — demo works without live data
      })
      .finally(() => setQuestionsLoading(false));
  }, []);

  const handleDemoVote = (side: "yes" | "no") => {
    if (demoVote || demoAnimating) return;
    setDemoVote(side);
    setDemoAnimating(true);

    // Simulate market movement after vote
    setTimeout(() => {
      const shift = side === "yes" ? 4 : -4;
      const newYes = Math.max(5, Math.min(95, demoYes + shift));
      const newNo = 100 - newYes;
      setDemoYes(newYes);
      setDemoNo(newNo);
    }, 400);

    // Auto-resolve the demo after a short delay
    setTimeout(() => {
      setDemoResolved(true);
      setDemoAnimating(false);
      // The "correct" answer in the demo is always YES — user wins if they voted yes
      setDemoResolvedOutcome(side === "yes" ? "win" : "loss");
    }, 2800);
  };

  const resetDemo = () => {
    setDemoVote(null);
    setDemoAnimating(false);
    setDemoResolved(false);
    setDemoResolvedOutcome(null);
    setDemoYes(DEMO_QUESTION.yes_percent);
    setDemoNo(DEMO_QUESTION.no_percent);
  };

  return (
    <main className="min-h-screen text-white">
      {/* ─── Nav ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[#0a1120]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">The Analyst</p>
            <p className="text-base font-semibold text-white leading-none">High-Signal Feed</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-[var(--brand)] px-4 py-1.5 text-sm font-semibold text-slate-950 hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pt-20 pb-16 text-center">
        <p className="mb-3 inline-block rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-4 py-1 text-xs font-medium tracking-wide text-[var(--brand)]">
          Prediction Markets · Real Analysis
        </p>
        <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Put your conviction<br className="hidden sm:block" /> on the line
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-slate-400 leading-relaxed">
          The Analyst is a high-signal prediction market where you can stake points on real-world questions across
          crypto, markets, politics, and more — and see how your forecasts stack up.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="w-full max-w-xs rounded-xl bg-[var(--brand)] px-6 py-3 text-base font-semibold text-slate-950 hover:brightness-110 sm:w-auto"
          >
            Create free account →
          </Link>
          <Link
            href="/feed"
            className="w-full max-w-xs rounded-xl border border-[var(--stroke)] px-6 py-3 text-base font-medium text-slate-300 hover:border-slate-400 hover:text-white sm:w-auto"
          >
            Browse questions
          </Link>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="mb-8 text-center text-xl font-semibold text-white">How it works</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Browse open questions",
              body: "Explore questions on crypto, economy, sports, and world events. Each question has live market odds driven by participants.",
            },
            {
              step: "2",
              title: "Stake your prediction",
              body: "Allocate points on YES or NO. Your entry affects the market odds — early movers get better prices on the winning side.",
            },
            {
              step: "3",
              title: "Earn when you're right",
              body: "Questions are resolved by the admin with verifiable outcomes. Winners split the pool. Track your score on the leaderboard.",
            },
          ].map((card) => (
            <div key={card.step} className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]/15 text-sm font-bold text-[var(--brand)]">
                {card.step}
              </div>
              <p className="mb-1.5 font-semibold text-white">{card.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Live Questions Preview ───────────────────────── */}
      {(questionsLoading || questions.length > 0) && (
        <section className="mx-auto max-w-5xl px-5 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Live questions right now</h2>
            <Link href="/feed" className="text-sm text-[var(--brand)] hover:underline">
              See all →
            </Link>
          </div>

          {questionsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {questions.map((q) => {
                const yes = Number(q.yes_percent ?? 50);
                const no = Number(q.no_percent ?? 50);
                return (
                  <div
                    key={q._id}
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 hover:border-[var(--brand)]/40 transition-colors"
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{q.category}</p>
                    <p className="mb-3 line-clamp-2 text-sm font-medium text-white leading-snug">{q.title}</p>
                    <ProbBar yes={yes} no={no} />
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span className="text-emerald-400">YES {yes.toFixed(0)}%</span>
                      <span className="text-slate-500">Closes {formatDate(q.closing_time)}</span>
                      <span className="text-orange-400">NO {no.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Interactive Demo ─────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--surface)] p-6 sm:p-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />
            <p className="text-xs uppercase tracking-widest text-[var(--brand)] font-medium">Live demo</p>
          </div>
          <h2 className="mb-1 text-lg font-semibold text-white">Try a prediction — no account needed</h2>
          <p className="mb-5 text-sm text-slate-400">
            This is a simulation. Your vote shifts market odds and auto-resolves in a few seconds.
          </p>

          {/* Question card */}
          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-5 mb-5">
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-500">{DEMO_QUESTION.category}</p>
            <p className="mb-4 text-base font-medium text-white">{DEMO_QUESTION.title}</p>
            <ProbBar yes={demoYes} no={demoNo} />
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-emerald-400">YES {demoYes.toFixed(0)}%</span>
              <span className="text-slate-500">Entry: {DEMO_QUESTION.entry_cost} pts</span>
              <span className="text-orange-400">NO {demoNo.toFixed(0)}%</span>
            </div>
          </div>

          {/* Outcome overlay */}
          {demoResolved ? (
            <div className={`rounded-xl border p-5 text-center ${demoResolvedOutcome === "win" ? "border-emerald-500/40 bg-emerald-500/10" : "border-orange-500/40 bg-orange-500/10"}`}>
              <p className={`text-xl font-bold mb-1 ${demoResolvedOutcome === "win" ? "text-emerald-400" : "text-orange-400"}`}>
                {demoResolvedOutcome === "win" ? "✓ You called it right!" : "✗ Incorrect this time"}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {demoResolvedOutcome === "win"
                  ? "In a real market, you'd receive a payout from the pool — more than you staked."
                  : "In a real market, your stake goes to the winning side. Better luck next time."}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={resetDemo}
                  className="rounded-lg border border-[var(--stroke)] px-5 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-white"
                >
                  Try again
                </button>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
                >
                  Create account to play for real →
                </Link>
              </div>
            </div>
          ) : demoVote ? (
            <div className="rounded-xl border border-[var(--stroke)] bg-slate-800/40 p-4 text-center">
              <p className="text-sm text-slate-400 animate-pulse">
                You voted <span className={demoVote === "yes" ? "text-emerald-400 font-semibold" : "text-orange-400 font-semibold"}>{demoVote.toUpperCase()}</span>. Market is settling...
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-center text-xs text-slate-500 uppercase tracking-wide">Make your prediction</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDemoVote("yes")}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  YES — {demoYes.toFixed(0)}%
                </button>
                <button
                  onClick={() => handleDemoVote("no")}
                  className="flex-1 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-500 transition-colors"
                >
                  NO — {demoNo.toFixed(0)}%
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-24 text-center">
        <div className="rounded-2xl border border-[var(--stroke)] bg-gradient-to-b from-[var(--surface)] to-[#060a13] p-10">
          <h2 className="mb-3 text-2xl font-bold text-white">Ready to put your analysis to the test?</h2>
          <p className="mx-auto mb-7 max-w-md text-sm text-slate-400 leading-relaxed">
            Sign up for free, get your starting points, and start predicting on live markets today.
            Track your accuracy and climb the leaderboard.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded-xl bg-[var(--brand)] px-8 py-3 text-base font-semibold text-slate-950 hover:brightness-110"
          >
            Create free account →
          </Link>
          <p className="mt-3 text-xs text-slate-500">No payment required · Points-based system</p>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-[var(--stroke)] py-8 text-center text-xs text-slate-600">
        <p>The Analyst · Prediction Markets</p>
        <div className="mt-2 flex justify-center gap-5">
          <Link href="/feed" className="hover:text-slate-400">Feed</Link>
          <Link href="/leaderboard" className="hover:text-slate-400">Leaderboard</Link>
          <Link href="/auth/login" className="hover:text-slate-400">Sign in</Link>
          <Link href="/auth/signup" className="hover:text-slate-400">Sign up</Link>
        </div>
      </footer>
    </main>
  );
}
