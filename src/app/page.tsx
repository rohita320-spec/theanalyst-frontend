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

function TrendSparkline({ points }: { points: number[] }) {
  const safePoints = points.length > 1 ? points : [50, 50];
  const width = 220;
  const height = 56;
  const step = width / (safePoints.length - 1);
  const toY = (value: number) => {
    const normalized = Math.max(0, Math.min(100, value));
    return ((100 - normalized) / 100) * (height - 8) + 4;
  };
  const path = safePoints
    .map((value, index) => `${index * step},${toY(value)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <polyline points={path} fill="none" stroke="rgb(80 227 194)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Demo state
  const [demoVote, setDemoVote] = useState<"yes" | "no" | null>(null);
  const [demoYes, setDemoYes] = useState(DEMO_QUESTION.yes_percent);
  const [demoNo, setDemoNo] = useState(DEMO_QUESTION.no_percent);
  const [trendPoints, setTrendPoints] = useState<number[]>([58, 60, 59, 61, DEMO_QUESTION.yes_percent]);
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
      const shift = side === "yes" ? 5 : -5;
      const newYes = Math.max(5, Math.min(95, demoYes + shift));
      const newNo = 100 - newYes;
      setDemoYes(newYes);
      setDemoNo(newNo);
      setTrendPoints((prev) => [...prev.slice(-6), newYes]);
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
            <p className="text-base font-semibold text-white leading-none">High-Signal Analysis Feed</p>
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
          Prediction Markets · Real-World Analysis
        </p>
        <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Put your conviction<br className="hidden sm:block" /> into action
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-slate-400 leading-relaxed">
          The Analyst is a high-signal prediction platform where you can use points to express your view on real-world
          questions across crypto, markets, global events, and more — and see how your analysis performs over time.
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
              body: "Explore questions across crypto, economy, sports, and global events. Each question reflects real-time sentiment based on participant activity.",
            },
            {
              step: "2",
              title: "Submit your view",
              body: "Allocate points to YES or NO based on your analysis. Your input contributes to the overall market sentiment.",
            },
            {
              step: "3",
              title: "Track your performance",
              body: "Questions are resolved using predefined rules and verifiable outcomes. Your performance is reflected on the leaderboard based on accuracy and consistency.",
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
          setTrendPoints([58, 60, 59, 61, DEMO_QUESTION.yes_percent]);
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {questions.map((q) => {
                const yes = Number(q.yes_percent ?? 50);
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 sm:px-5">
                return (
                  <div
                  <p className="text-[15px] font-semibold leading-none text-white">Analysis & Forecast Feed</p>
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 hover:border-[var(--brand)]/40 transition-colors"
                <div className="flex items-center gap-2.5 text-sm">
                  <Link href="/feed" className="text-slate-300 hover:text-white transition-colors">
                    Feed
                  </Link>
                  <Link href="/leaderboard" className="text-slate-300 hover:text-white transition-colors">
                    Leaderboard
                  </Link>
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{q.category}</p>
                    <p className="mb-3 line-clamp-2 text-sm font-medium text-white leading-snug">{q.title}</p>
                    <ProbBar yes={yes} no={no} />
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span className="text-emerald-400">YES {yes.toFixed(0)}%</span>
                    className="rounded-lg bg-[var(--brand)] px-3.5 py-1.5 text-sm font-semibold text-slate-950 hover:brightness-110"
                      <span className="text-orange-400">NO {no.toFixed(0)}%</span>
                    Sign up
                  </div>
                );
              })}
            </div>
          )}
            {/* ─── Compact Hero + How It Works ──────────────────── */}
            <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-4 pt-5 sm:px-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
                <p className="mb-2 inline-block rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--brand)]">
                  Forecasting Platform · Points-Based Participation
                </p>
                <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  Submit your view on live questions and track performance over time
                </h1>
                <p className="mb-4 max-w-xl text-sm leading-relaxed text-slate-400">
                  Explore event-driven questions, allocate points to YES or NO, and monitor how outcomes influence your ranking.
                  No money is used and no financial advice is provided.
                </p>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                  <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-center text-sm font-semibold text-slate-950 hover:brightness-110">
                    Sign up free
                  </Link>
                  <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-5 py-2.5 text-center text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white">
                    Browse questions
                  </Link>
                </div>
                <p className="text-xs text-slate-500">
                  Informational and educational use only. See the Disclaimer and Terms links below.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      "Browse open questions",
                      "Allocate points to your view",
                      "Track results and ranking",
                    ].map((line, index) => (
                      <div key={line} className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-xs text-slate-300">
                        <span className="mr-1 text-[var(--brand)]">0{index + 1}.</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Positioning</p>
                  <p className="text-xs leading-relaxed text-slate-400">
                    This is an analysis and forecasting tool. Outcomes are governed by predefined question rules and a points system with no monetary value.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── Compact question strip ───────────────────────── */}
            {(questionsLoading || questions.length > 0) && (
              <section className="mx-auto max-w-6xl px-4 pb-5 sm:px-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live questions</h2>
                  <Link href="/feed" className="text-xs text-[var(--brand)] hover:underline">
                    View all
                  </Link>
                </div>
                {questionsLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl border border-[var(--stroke)] bg-[var(--surface)]" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {questions.slice(0, 3).map((q) => {
                      const yes = Number(q.yes_percent ?? 50);
                      const no = Number(q.no_percent ?? 50);
                      return (
                        <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{q.category}</p>
                          <p className="mb-2 line-clamp-2 text-xs font-medium leading-snug text-white">{q.title}</p>
                          <ProbBar yes={yes} no={no} />
                          <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                            <span className="text-emerald-400">YES {yes.toFixed(0)}%</span>
                            <span>{formatDate(q.closing_time)}</span>
                            <span className="text-orange-400">NO {no.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ─── Enhanced Interactive Demo ────────────────────── */}
            <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-5">
              <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--surface)] p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--brand)]">Interactive demo</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{DEMO_QUESTION.category}</p>
                    <p className="mb-3 text-sm font-medium text-white">{DEMO_QUESTION.title}</p>
                    <ProbBar yes={demoYes} no={demoNo} />
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-emerald-400">YES {demoYes.toFixed(0)}%</span>
                      <span className="text-slate-500">Entry {DEMO_QUESTION.entry_cost} pts</span>
                      <span className="text-orange-400">NO {demoNo.toFixed(0)}%</span>
                    </div>
                    <div className="mt-3 rounded-lg border border-[var(--stroke)] bg-slate-900/50 px-2 py-1.5">
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Market trend (demo)</p>
                      <TrendSparkline points={trendPoints} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                    {!demoResolved ? (
                      <>
                        <p className="mb-2 text-xs text-slate-400">
                          Choose a side to see immediate market movement, then a quick outcome simulation.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDemoVote("yes")}
                            disabled={!!demoVote || demoAnimating}
                            className="rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            YES {demoYes.toFixed(0)}%
                          </button>
                          <button
                            onClick={() => handleDemoVote("no")}
                            disabled={!!demoVote || demoAnimating}
                            className="rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            NO {demoNo.toFixed(0)}%
                          </button>
                        </div>
                        <div className="mt-3 rounded-lg border border-[var(--stroke)] px-3 py-2 text-xs text-slate-400">
                          {!demoVote ? "Step 1: submit your view" : `Step 2: market shifted after your ${demoVote.toUpperCase()} input`}
                        </div>
                        {demoVote && (
                          <div className="mt-2 rounded-lg border border-[var(--stroke)] px-3 py-2 text-xs text-slate-400 animate-pulse">
                            Step 3: resolving demo outcome...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={`rounded-lg border p-3 text-center ${demoResolvedOutcome === "win" ? "border-emerald-500/40 bg-emerald-500/10" : "border-orange-500/40 bg-orange-500/10"}`}>
                        <p className={`text-base font-bold ${demoResolvedOutcome === "win" ? "text-emerald-400" : "text-orange-400"}`}>
                          {demoResolvedOutcome === "win" ? "Result matched your view" : "Result did not match your view"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          In live questions, result consistency contributes to your ranking profile.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={resetDemo} className="flex-1 rounded-lg border border-[var(--stroke)] py-2 text-xs text-slate-300 hover:border-slate-400">
                            Try again
                          </button>
                          <Link href="/auth/signup" className="flex-1 rounded-lg bg-[var(--brand)] py-2 text-center text-xs font-semibold text-slate-950 hover:brightness-110">
                            Sign up
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Footer / Legal ──────────────────────────────── */}
            <footer className="border-t border-[var(--stroke)] py-6 text-center text-xs text-slate-500">
              <p className="mx-auto mb-2 max-w-4xl px-4 leading-relaxed">
                The Analyst is provided for informational, educational, and analytical purposes only. It does not provide financial, investment, or trading advice. The platform uses points with no monetary value.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-4">
                <Link href="/feed" className="hover:text-slate-300">Feed</Link>
                <Link href="/leaderboard" className="hover:text-slate-300">Leaderboard</Link>
                <Link href="/terms" className="hover:text-slate-300">Terms & Conditions</Link>
                <Link href="/disclaimer" className="hover:text-slate-300">Disclaimer</Link>
                <Link href="/auth/signup" className="hover:text-slate-300">Sign up</Link>
              </div>
            </footer>
