"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

const DEMO_QUESTION = {
  title: "Will the Fed keep interest rates unchanged at their next meeting?",
  category: "Economy",
  yes_percent: 62,
  no_percent: 38,
  entry_cost: 300,
};

// Richer starting history for the demo sparkline
const INITIAL_TREND = [54, 57, 55, 59, 58, 61, 60, 62];

function formatDate(iso?: string) {
  if (!iso) return "-";
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

function TrendSparkline({ points, highlight }: { points: number[]; highlight?: boolean }) {
  const values = points.length > 1 ? points : [50, 50];
  const width = 260;
  const height = 52;
  const step = width / (values.length - 1);
  const toY = (v: number) => ((100 - Math.max(0, Math.min(100, v))) / 100) * (height - 8) + 4;
  const path = values.map((v, i) => `${i * step},${toY(v)}`).join(" ");
  const lastX = (values.length - 1) * step;
  const lastY = toY(values[values.length - 1]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(80 227 194)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(80 227 194)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polyline
        points={`0,${height} ${path} ${lastX},${height}`}
        fill="url(#trendGrad)"
        stroke="none"
      />
      {/* Line */}
      <polyline points={path} fill="none" stroke="rgb(80 227 194)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dot at latest point */}
      <circle cx={lastX} cy={lastY} r="3" fill={highlight ? "rgb(251 191 36)" : "rgb(80 227 194)"} />
    </svg>
  );
}

export default function LandingPage() {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [demoVote, setDemoVote] = useState<"yes" | "no" | null>(null);
  const [demoYes, setDemoYes] = useState(DEMO_QUESTION.yes_percent);
  const [demoNo, setDemoNo] = useState(DEMO_QUESTION.no_percent);
  const [trendPoints, setTrendPoints] = useState<number[]>(INITIAL_TREND);
  const [demoResolved, setDemoResolved] = useState(false);
  const [demoResolvedOutcome, setDemoResolvedOutcome] = useState<"win" | "loss" | null>(null);
  const [demoShiftLabel, setDemoShiftLabel] = useState<string | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/feed_questions?limit=6&status=open`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.results?.length) setQuestions(body.results.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setQuestionsLoading(false));
  }, []);

  // Live animation — makes the graph feel alive while no vote is cast
  useEffect(() => {
    if (demoVote) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }
    animRef.current = setInterval(() => {
      setTrendPoints((prev) => {
        const last = prev[prev.length - 1];
        const drift = (Math.random() - 0.48) * 2.4; // slight upward bias
        const next = Math.max(48, Math.min(74, last + drift));
        return [...prev.slice(-9), Math.round(next * 10) / 10];
      });
    }, 1400);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [demoVote]);

  const handleDemoVote = (side: "yes" | "no") => {
    if (demoVote) return;
    setDemoVote(side);

    const shift = side === "yes" ? 6 : -6;
    const newYes = Math.max(5, Math.min(95, demoYes + shift));
    const newNo = 100 - newYes;
    const displayShift = Math.abs(newYes - demoYes).toFixed(0);
    setDemoShiftLabel(
      side === "yes"
        ? `YES +${displayShift}% after your view`
        : `NO +${displayShift}% after your view`
    );

    // Animate the shift in 3 steps for visual effect
    setTimeout(() => {
      const mid = demoYes + shift * 0.4;
      setTrendPoints((prev) => [...prev.slice(-9), Math.round(mid * 10) / 10]);
    }, 280);
    setTimeout(() => {
      const mid2 = demoYes + shift * 0.75;
      setTrendPoints((prev) => [...prev.slice(-9), Math.round(mid2 * 10) / 10]);
    }, 560);
    setTimeout(() => {
      setDemoYes(newYes);
      setDemoNo(newNo);
      setTrendPoints((prev) => [...prev.slice(-9), newYes]);
    }, 820);

    setTimeout(() => {
      setDemoResolved(true);
      setDemoResolvedOutcome(side === "yes" ? "win" : "loss");
    }, 2400);
  };

  const resetDemo = () => {
    setDemoVote(null);
    setDemoResolved(false);
    setDemoResolvedOutcome(null);
    setDemoShiftLabel(null);
    setDemoYes(DEMO_QUESTION.yes_percent);
    setDemoNo(DEMO_QUESTION.no_percent);
    setTrendPoints(INITIAL_TREND);
  };

  return (
    <main className="min-h-screen text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[#0a1120]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 sm:px-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">The Analyst</p>
            <p className="text-[15px] font-semibold leading-none text-white">Analysis and Forecast Feed</p>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Link href="/feed" className="text-slate-300 hover:text-white">Feed</Link>
            <Link href="/leaderboard" className="text-slate-300 hover:text-white">Leaderboard</Link>
            <Link href="/auth/login" className="text-slate-300 hover:text-white">Sign in</Link>
            <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-3.5 py-1.5 font-semibold text-slate-950 hover:brightness-110">Sign up</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero + How it works ── */}
      <section className="mx-auto grid w-full max-w-6xl gap-3 px-4 pb-3 pt-4 sm:px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="mb-1.5 inline-block rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-0.5 text-[11px] font-medium tracking-wide text-[var(--brand)]">
            Forecasting Platform | Points-Based Participation
          </p>
          <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Submit your view on live questions and track performance over time
          </h1>
          <p className="mb-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Explore event-driven questions, submit your view using points on YES or NO, and monitor how outcomes influence your ranking.
          </p>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-5 py-2 text-center text-sm font-semibold text-slate-950 hover:brightness-110">Sign up free</Link>
            <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-5 py-2 text-center text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white">Browse questions</Link>
          </div>
          <p className="text-xs text-slate-500">Informational and educational use only. See <Link href="/disclaimer" className="underline hover:text-slate-300">Disclaimer</Link> and <Link href="/terms" className="underline hover:text-slate-300">Terms</Link>.</p>
        </div>

        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
          <div className="grid gap-1.5">
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-1.5 text-xs text-slate-300">01. Browse open questions</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-1.5 text-xs text-slate-300">02. Submit your view using points</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-1.5 text-xs text-slate-300">03. Track results and ranking</div>
          </div>
        </div>
      </section>

      {/* ── Live questions ── */}
      <section className="mx-auto max-w-6xl px-4 pb-3 sm:px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live questions</h2>
          <Link href="/feed" className="text-xs text-[var(--brand)] hover:underline">View all</Link>
        </div>
        {questionsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--stroke)] bg-[var(--surface)]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {questions.slice(0, 3).map((q) => {
              const yes = Number(q.yes_percent ?? 50);
              const no = Number(q.no_percent ?? 50);
              return (
                <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-500">{q.category}</p>
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

      {/* ── Interactive demo ── */}
      <section className="mx-auto max-w-6xl px-4 pb-5 sm:px-5">
        <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--surface)] p-3.5 sm:p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--brand)]">Interactive demo — try it</p>
          <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
            {/* Left — question + chart */}
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3.5">
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-500">{DEMO_QUESTION.category}</p>
              <p className="mb-2 text-sm font-medium text-white">{DEMO_QUESTION.title}</p>
              <ProbBar yes={demoYes} no={demoNo} />
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-emerald-400">YES {demoYes.toFixed(0)}%</span>
                <span className="text-slate-500">Entry {DEMO_QUESTION.entry_cost} pts</span>
                <span className="text-orange-400">NO {demoNo.toFixed(0)}%</span>
              </div>
              {/* Sparkline */}
              <div className="mt-2.5 rounded-lg border border-[var(--stroke)] bg-slate-900/50 px-2 py-1.5">
                <div className="mb-0.5 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Market trend (live)</p>
                  {demoShiftLabel && (
                    <span className="text-[10px] font-semibold text-yellow-400 animate-pulse">{demoShiftLabel}</span>
                  )}
                </div>
                <TrendSparkline points={trendPoints} highlight={!!demoVote} />
              </div>
            </div>

            {/* Right — vote / outcome */}
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3.5">
              {!demoResolved ? (
                <div>
                  <p className="mb-2 text-xs text-slate-400">
                    {demoVote ? "View submitted — watching market move…" : "Submit your view to see the market react:"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDemoVote("yes")}
                      disabled={!!demoVote}
                      className="rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                    >
                      YES {demoYes.toFixed(0)}%
                    </button>
                    <button
                      onClick={() => handleDemoVote("no")}
                      disabled={!!demoVote}
                      className="rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
                    >
                      NO {demoNo.toFixed(0)}%
                    </button>
                  </div>
                  {demoVote && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">Resolving shortly…</p>
                  )}
                </div>
              ) : (
                <div className={`rounded-lg border p-3 text-center ${demoResolvedOutcome === "win" ? "border-emerald-500/40 bg-emerald-500/10" : "border-orange-500/40 bg-orange-500/10"}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Outcome</p>
                  <p className={`text-base font-bold ${demoResolvedOutcome === "win" ? "text-emerald-400" : "text-orange-400"}`}>
                    {demoResolvedOutcome === "win" ? "✓ View matched the result" : "✗ View did not match result"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={resetDemo} className="flex-1 rounded-lg border border-[var(--stroke)] py-2 text-xs text-slate-300 hover:border-slate-400">Try again</button>
                    <Link href="/auth/signup" className="flex-1 rounded-lg bg-[var(--brand)] py-2 text-center text-xs font-semibold text-slate-950 hover:brightness-110">Sign up</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--stroke)] py-4 text-center text-xs text-slate-500">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/feed" className="hover:text-slate-300">Feed</Link>
          <Link href="/leaderboard" className="hover:text-slate-300">Leaderboard</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms & Conditions</Link>
          <Link href="/disclaimer" className="hover:text-slate-300">Disclaimer</Link>
          <Link href="/auth/signup" className="hover:text-slate-300">Sign up</Link>
        </div>
      </footer>
    </main>
  );
}
