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

type DemoQuestion = {
  id: string;
  question_text: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  status: string;
};

const DEMO_QUESTION = {
  title: "Will the Fed keep interest rates unchanged at their next meeting?",
  category: "Economy",
  yes_percent: 62,
  no_percent: 38,
  entry_cost: 300,
};

const DEMO_PREVIEW_QUESTIONS: DemoQuestion[] = [
  {
    id: "demo_markets_1",
    question_text: "Will the S&P 500 close above 5,700 this month?",
    category: "Markets",
    yes_percent: 58,
    no_percent: 42,
    status: "open",
  },
  {
    id: "demo_sports_1",
    question_text: "Will India win the next T20 international series?",
    category: "Sports",
    yes_percent: 61,
    no_percent: 39,
    status: "open",
  },
  {
    id: "demo_economy_1",
    question_text: "Will annual inflation print below 4.5% in the next release?",
    category: "Economy",
    yes_percent: 47,
    no_percent: 53,
    status: "open",
  },
];

// Richer starting history for the demo sparkline
const INITIAL_TREND = [54, 57, 55, 59, 58, 61, 60, 62];

const DEMO_RULES = [
  "Outcome is determined at close using publicly verifiable data.",
  "YES resolves true when the stated condition is satisfied.",
  "NO resolves true when the stated condition is not satisfied.",
];

function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProbBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
      <div className="bg-[var(--yes)] transition-all duration-700" style={{ width: `${yes}%` }} />
      <div className="bg-[var(--no)] transition-all duration-700" style={{ width: `${no}%` }} />
    </div>
  );
}

function DemoTrendChart({ points }: { points: number[] }) {
  const values = points.length > 1 ? points : [50, 50];
  const noValues = values.map((v) => 100 - v);

  const W = 520;
  const H = 200;
  const ML = 36;
  const MR = 12;
  const MT = 16;
  const MB = 30;
  const CW = W - ML - MR;
  const CH = H - MT - MB;

  const pctToY = (pct: number) => MT + (1 - pct / 100) * CH;
  const indexToX = (i: number, n: number) => ML + (i / Math.max(n - 1, 1)) * CW;

  const yesPath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${indexToX(i, values.length).toFixed(1)} ${pctToY(v).toFixed(1)}`)
    .join(" ");
  const noPath = noValues
    .map((v, i) => `${i === 0 ? "M" : "L"}${indexToX(i, noValues.length).toFixed(1)} ${pctToY(v).toFixed(1)}`)
    .join(" ");
  const yesAreaPath = `${yesPath} L${indexToX(values.length - 1, values.length).toFixed(1)} ${(MT + CH).toFixed(1)} L${ML.toFixed(1)} ${(MT + CH).toFixed(1)} Z`;

  const yTicks = [0, 25, 50, 75, 100];
  const labelIdx = [0, Math.floor((values.length - 1) / 2), values.length - 1];
  const labels = ["Open", "Mid", "Now"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="demoYesGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((pct) => {
        const y = pctToY(pct);
        return (
          <g key={pct}>
            <line
              x1={ML}
              y1={y}
              x2={W - MR}
              y2={y}
              stroke={pct === 50 ? "#334155" : "#1e293b"}
              strokeWidth={pct === 50 ? 1.3 : 1}
              strokeDasharray={pct === 50 ? "4,3" : undefined}
            />
            <text x={ML - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">
              {pct}%
            </text>
          </g>
        );
      })}

      <line x1={ML} y1={MT} x2={ML} y2={MT + CH} stroke="#334155" strokeWidth="1" />
      <line x1={ML} y1={MT + CH} x2={W - MR} y2={MT + CH} stroke="#334155" strokeWidth="1" />

      {labelIdx.map((idx, i) => (
        <text key={`${idx}-${i}`} x={indexToX(idx, values.length)} y={H - 8} textAnchor="middle" fill="#64748b" fontSize="10">
          {labels[i]}
        </text>
      ))}

      <path d={yesAreaPath} fill="url(#demoYesGrad)" />
      <path d={noPath} fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
      <path d={yesPath} fill="none" stroke="#34d399" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />

      {values.map((v, i) => (
        <circle key={`yes-${i}`} cx={indexToX(i, values.length)} cy={pctToY(v)} r="2.8" fill="#34d399" />
      ))}
      {noValues.map((v, i) => (
        <circle key={`no-${i}`} cx={indexToX(i, noValues.length)} cy={pctToY(v)} r="2.5" fill="#fb923c" />
      ))}
    </svg>
  );
}

function DemoMiniTrendChart({ points }: { points: number[] }) {
  const values = points.length > 1 ? points : [50, 50];
  const W = 260;
  const H = 80;
  const P = 6;
  const CH = H - P * 2;
  const CW = W - P * 2;

  const toX = (i: number, n: number) => P + (i / Math.max(n - 1, 1)) * CW;
  const toY = (pct: number) => P + (1 - pct / 100) * CH;

  const yesPath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, values.length).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");
  const noPath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, values.length).toFixed(1)} ${toY(100 - v).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#1f2a40" strokeWidth="1" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#1f2a40" strokeWidth="1" />
      <path d={noPath} fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" />
      <path d={yesPath} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [demoQuestions, setDemoQuestions] = useState<DemoQuestion[]>(DEMO_PREVIEW_QUESTIONS);
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

    fetch(`${API_BASE}/landing/demo_questions?limit=3`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.results?.length) {
          setDemoQuestions(body.results);
        }
      })
      .catch(() => {});
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

  const buildMiniSeries = (center: number, seed: number) => {
    const points: number[] = [];
    for (let i = 0; i < 7; i++) {
      const wave = Math.sin((i + 1 + seed) * 0.9) * 2.1;
      const drift = (i - 3) * 0.25;
      const val = Math.max(15, Math.min(85, center + wave + drift));
      points.push(Math.round(val * 10) / 10);
    }
    return points;
  };

  return (
    <main className="min-h-screen text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[#0a1120]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">The Analyst</p>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">High-Signal Analysis Feed</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-1 sm:grid-cols-5 md:w-auto md:items-center">
            <Link href="/feed" className="rounded-lg px-3 py-2 text-center text-sm text-slate-300 hover:text-white">Feed</Link>
            <Link href="/leaderboard" className="rounded-lg px-3 py-2 text-center text-sm text-slate-300 hover:text-white">Leaderboard</Link>
            <Link href="/test" className="rounded-lg px-3 py-2 text-center text-sm text-[var(--brand)] hover:text-white">Test</Link>
            <Link href="/auth/login" className="rounded-lg px-3 py-2 text-center text-sm text-slate-300 hover:text-white">Sign in</Link>
            <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-center text-sm font-semibold text-slate-950 hover:brightness-110">Sign up</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero + How it works ── */}
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-4 pt-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
          <p className="mb-1.5 inline-block rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-0.5 text-[11px] font-medium tracking-wide text-[var(--brand)]">
            Forecasting Platform | Points-Based Participation
          </p>
          <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Submit Your Analysis
          </h1>
          <p className="mb-4 max-w-xl text-sm leading-relaxed text-slate-400">
            Explore event-driven questions, submit your view using points on YES or NO, and monitor how outcomes influence your ranking.
          </p>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-center text-sm font-semibold text-slate-950 hover:brightness-110">Sign up free</Link>
            <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-5 py-2.5 text-center text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white">Browse questions</Link>
            <Link href="/test" className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-5 py-2.5 text-center text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20">Open test page</Link>
          </div>
          <p className="text-xs text-slate-500">Informational and educational use only. See <Link href="/rules" className="underline hover:text-slate-300">Rules & Guidelines</Link>, <Link href="/disclaimer" className="underline hover:text-slate-300">Disclaimer</Link>, and <Link href="/terms" className="underline hover:text-slate-300">Terms</Link>.</p>
        </div>

        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
          <div className="grid gap-2">
            <div className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-xs text-slate-300">01. Browse open questions</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-xs text-slate-300">02. Submit your view using points</div>
            <div className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-xs text-slate-300">03. Track results and ranking</div>
          </div>
        </div>
      </section>

      {/* ── Live questions ── */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
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
                <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-2)] p-3.5">
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
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:p-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--brand)]">Interactive demo — category mix preview</p>
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left — question + chart */}
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-2)] p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 inline-flex rounded-full bg-[var(--brand)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">{DEMO_QUESTION.category}</p>
                  <p className="text-sm font-semibold text-white">{DEMO_QUESTION.title}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">Open</span>
              </div>

              <div className="mb-2 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
                <div className="mb-2 flex justify-between text-[11px] text-slate-400">
                  <span>Entry: {DEMO_QUESTION.entry_cost} pts</span>
                  <span>Pool: 21,400 pts</span>
                </div>
                <ProbBar yes={demoYes} no={demoNo} />
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-[var(--yes)]">YES {demoYes.toFixed(2)}%</span>
                  <span className="text-[var(--no)]">NO {demoNo.toFixed(2)}%</span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Question Trend</p>
                  {demoShiftLabel && (
                    <span className="text-[10px] font-semibold text-yellow-400 animate-pulse">{demoShiftLabel}</span>
                  )}
                </div>
                <DemoTrendChart points={trendPoints} />
                <div className="mt-2 flex items-center gap-4 px-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="inline-block h-2 w-4 rounded-sm bg-[var(--yes)]" /> YES %
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="inline-block h-2 w-4 rounded-sm bg-[var(--no)]" /> NO %
                  </span>
                </div>
              </div>

              {!demoResolved ? (
                <div className="mt-3 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
                  <p className="mb-2 text-xs text-slate-400">
                    {demoVote ? "View submitted — watching market move..." : "Submit your view to see the market react:"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDemoVote("yes")}
                      disabled={!!demoVote}
                      className="rounded-lg bg-[var(--yes)] py-2.5 text-sm font-semibold text-slate-950 transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      YES {demoYes.toFixed(0)}%
                    </button>
                    <button
                      onClick={() => handleDemoVote("no")}
                      disabled={!!demoVote}
                      className="rounded-lg bg-[var(--no)] py-2.5 text-sm font-semibold text-slate-950 transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      NO {demoNo.toFixed(0)}%
                    </button>
                  </div>
                  {demoVote && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">Resolving shortly...</p>
                  )}
                </div>
              ) : (
                <div className={`mt-3 rounded-lg border p-3 text-center ${demoResolvedOutcome === "win" ? "border-emerald-500/40 bg-emerald-500/10" : "border-orange-500/40 bg-orange-500/10"}`}>
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

              <div className="mt-3 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Resolution Rules</h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {DEMO_RULES.map((rule, idx) => (
                    <li key={idx}>• {rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-2)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Live Demo For Guests</p>
                  <h3 className="text-sm font-semibold text-white">3 demo questions with trend graphs</h3>
                </div>
                <Link href="/feed" className="text-xs text-[var(--brand)] hover:underline">Open full feed</Link>
              </div>

              <div className="space-y-3">
                {demoQuestions.slice(0, 3).map((demo) => (
                  <div key={demo.id} className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="rounded-full bg-[var(--brand)]/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--brand)]">
                        {demo.category}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        {demo.status}
                      </span>
                    </div>
                    <p className="mb-2 text-sm font-medium leading-snug text-white">{demo.question_text}</p>
                    <ProbBar yes={demo.yes_percent} no={demo.no_percent} />
                    <div className="mt-2 rounded-lg border border-[var(--stroke)] bg-[#091228] p-2">
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Mini Trend</p>
                      <DemoMiniTrendChart points={buildMiniSeries(demo.yes_percent, demo.id.length)} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400">YES {demo.yes_percent.toFixed(0)}%</span>
                      <span className="text-slate-500">Live market preview</span>
                      <span className="text-orange-400">NO {demo.no_percent.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-md bg-[var(--yes)]/90 py-1.5 text-[11px] font-semibold text-slate-950 hover:brightness-110">Try YES</button>
                      <button className="rounded-md bg-[var(--no)]/90 py-1.5 text-[11px] font-semibold text-slate-950 hover:brightness-110">Try NO</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-[var(--stroke)] bg-[#0b1528] p-3">
                <p className="text-xs text-slate-400">
                  The landing page now previews Markets, Sports, and Economy so users understand the platform range before signing up.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Rules & Legal</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Link href="/rules" className="rounded-md border border-[var(--stroke)] px-2.5 py-1 text-slate-300 hover:border-slate-400 hover:text-white">Rules & Guidelines</Link>
              <Link href="/terms" className="rounded-md border border-[var(--stroke)] px-2.5 py-1 text-slate-300 hover:border-slate-400 hover:text-white">Terms</Link>
              <Link href="/disclaimer" className="rounded-md border border-[var(--stroke)] px-2.5 py-1 text-slate-300 hover:border-slate-400 hover:text-white">Disclaimer</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--stroke)] py-4 text-center text-xs text-slate-500">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/feed" className="hover:text-slate-300">Feed</Link>
          <Link href="/leaderboard" className="hover:text-slate-300">Leaderboard</Link>
          <Link href="/rules" className="hover:text-slate-300">Rules & Guidelines</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms & Conditions</Link>
          <Link href="/disclaimer" className="hover:text-slate-300">Disclaimer</Link>
          <Link href="/auth/signup" className="hover:text-slate-300">Sign up</Link>
        </div>
      </footer>
    </main>
  );
}
