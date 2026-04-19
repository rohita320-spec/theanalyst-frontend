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

const DEMO_QUESTION = {
  title: "Will the Fed keep interest rates unchanged at their next meeting?",
  category: "Economy",
  yes_percent: 62,
  no_percent: 38,
  entry_cost: 300,
};

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

function TrendSparkline({ points }: { points: number[] }) {
  const values = points.length > 1 ? points : [50, 50];
  const width = 220;
  const height = 56;
  const step = width / (values.length - 1);
  const toY = (value: number) => ((100 - Math.max(0, Math.min(100, value))) / 100) * (height - 8) + 4;
  const path = values.map((value, index) => `${index * step},${toY(value)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <polyline points={path} fill="none" stroke="rgb(80 227 194)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [demoVote, setDemoVote] = useState<"yes" | "no" | null>(null);
  const [demoYes, setDemoYes] = useState(DEMO_QUESTION.yes_percent);
  const [demoNo, setDemoNo] = useState(DEMO_QUESTION.no_percent);
  const [trendPoints, setTrendPoints] = useState<number[]>([58, 60, 59, 61, DEMO_QUESTION.yes_percent]);
  const [demoResolved, setDemoResolved] = useState(false);
  const [demoResolvedOutcome, setDemoResolvedOutcome] = useState<"win" | "loss" | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/feed_questions?limit=6&status=open`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.results?.length) setQuestions(body.results.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setQuestionsLoading(false));
  }, []);

  const handleDemoVote = (side: "yes" | "no") => {
    if (demoVote) return;
    setDemoVote(side);

    setTimeout(() => {
      const shift = side === "yes" ? 5 : -5;
      const newYes = Math.max(5, Math.min(95, demoYes + shift));
      setDemoYes(newYes);
      setDemoNo(100 - newYes);
      setTrendPoints((prev) => [...prev.slice(-6), newYes]);
    }, 400);

    setTimeout(() => {
      setDemoResolved(true);
      setDemoResolvedOutcome(side === "yes" ? "win" : "loss");
    }, 2200);
  };

  const resetDemo = () => {
    setDemoVote(null);
    setDemoResolved(false);
    setDemoResolvedOutcome(null);
    setDemoYes(DEMO_QUESTION.yes_percent);
    setDemoNo(DEMO_QUESTION.no_percent);
    setTrendPoints([58, 60, 59, 61, DEMO_QUESTION.yes_percent]);
  };

  return (
    <main className="min-h-screen text-white">
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

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-4 pt-5 sm:px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
          <p className="mb-2 inline-block rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--brand)]">
            Forecasting Platform | Points-Based Participation
          </p>
          <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Submit your view on live questions and track performance over time
          </h1>
          <p className="mb-4 max-w-xl text-sm leading-relaxed text-slate-400">
            Explore event-driven questions, allocate points to YES or NO, and monitor how outcomes influence your ranking.
          </p>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-center text-sm font-semibold text-slate-950 hover:brightness-110">Sign up free</Link>
            <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-5 py-2.5 text-center text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white">Browse questions</Link>
          </div>
          <p className="text-xs text-slate-500">Informational and educational use only. See Disclaimer and Terms.</p>
        </div>

        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
          <div className="grid gap-2">
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-xs text-slate-300">01. Browse open questions</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-xs text-slate-300">02. Allocate points to your view</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-xs text-slate-300">03. Track results and ranking</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-5 sm:px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live questions</h2>
          <Link href="/feed" className="text-xs text-[var(--brand)] hover:underline">View all</Link>
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

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-5">
        <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--surface)] p-4 sm:p-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--brand)]">Interactive demo</p>
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
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Market trend</p>
                <TrendSparkline points={trendPoints} />
              </div>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
              {!demoResolved ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleDemoVote("yes")} disabled={!!demoVote} className="rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">YES {demoYes.toFixed(0)}%</button>
                  <button onClick={() => handleDemoVote("no")} disabled={!!demoVote} className="rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">NO {demoNo.toFixed(0)}%</button>
                </div>
              ) : (
                <div className={`rounded-lg border p-3 text-center ${demoResolvedOutcome === "win" ? "border-emerald-500/40 bg-emerald-500/10" : "border-orange-500/40 bg-orange-500/10"}`}>
                  <p className={`text-base font-bold ${demoResolvedOutcome === "win" ? "text-emerald-400" : "text-orange-400"}`}>
                    {demoResolvedOutcome === "win" ? "Result matched your view" : "Result did not match your view"}
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

      <footer className="border-t border-[var(--stroke)] py-6 text-center text-xs text-slate-500">
        <div className="mt-2 flex flex-wrap justify-center gap-4">
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
