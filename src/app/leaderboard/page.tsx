"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import AppHeader from "../../components/AppHeader";
import { fetchLeaderboard, type LeaderboardRow } from "../../lib/api";

type Period = "weekly" | "monthly" | "quarterly";

const periodLabels: Record<Period, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("weekly");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("auth_user") || "{}") as { username?: string };
      setMyUsername(u?.username ?? null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const leaderboardRows = await fetchLeaderboard(period);
      setRows(leaderboardRows);
      setLoading(false);
    };

    load();
  }, [period]);

  const eligibleRows = useMemo(() => {
    return rows.filter((row) => {
      // Exclude test-sandbox users from the public leaderboard
      if (row.username?.startsWith("sandbox_user")) return false;
      const resolved = Number(row.period_correct_predictions || 0) + Number(row.period_incorrect_predictions || 0);
      const spend = Number(row.period_points_spent || 0);
      const earned = Number(row.period_points_earned || 0);
      const lost = Number(row.period_points_lost || 0);
      const net = Number(row.period_net_points || 0);
      return resolved > 0 || spend > 0 || earned > 0 || lost > 0 || net !== 0;
    });
  }, [rows]);

  const topTen = useMemo(() => eligibleRows.slice(0, 10), [eligibleRows]);
  const avgRoi = useMemo(() => {
    if (!eligibleRows.length) return 0;
    const total = eligibleRows.reduce((sum, row) => sum + Number(row.period_roi_percent || 0), 0);
    return total / eligibleRows.length;
  }, [eligibleRows]);
  const avgAccuracy = useMemo(() => {
    const withResolved = eligibleRows.filter((r) => (Number(r.period_correct_predictions || 0) + Number(r.period_incorrect_predictions || 0)) > 0);
    if (!withResolved.length) return 0;
    const total = withResolved.reduce((sum, r) => {
      const res = Number(r.period_correct_predictions || 0) + Number(r.period_incorrect_predictions || 0);
      return sum + (Number(r.period_correct_predictions || 0) / res) * 100;
    }, 0);
    return Math.round(total / withResolved.length);
  }, [eligibleRows]);
  // Scale the ROI gain/loss bar so the biggest mover (up or down) fills its half of the track.
  const maxAbsRoi = useMemo(
    () => Math.max(1, ...topTen.map((r) => Math.abs(Number(r.period_roi_percent || 0)))),
    [topTen],
  );

  function handleCursorGlowMove(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    button.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    button.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="leaderboard" showPointsBalance={false} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-5">
          <div className="mb-5">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Leaderboard</h2>
            <p className="mt-1.5 text-sm text-slate-400">Ranked by net points over the period. Accuracy shows the skill behind it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["weekly", "monthly", "quarterly"] as Period[]).map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                onMouseMove={handleCursorGlowMove}
                className={`cursor-glow-button rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  period === value
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                    : "border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-slate-500"
                }`}
              >
                <span className="cursor-glow-layer" />
                <span className="cursor-shimmer-layer" />
                <span className="cursor-glow-content">{periodLabels[value]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="text-slate-400">Analysts ranked <span className="ml-1 font-semibold text-white">{eligibleRows.length}</span></span>
          <span className="text-slate-400">Avg accuracy <span className="ml-1 font-semibold text-white">{avgAccuracy}%</span></span>
          <span className="text-slate-400">Avg ROI <span className={`ml-1 font-semibold ${avgRoi >= 0 ? "text-emerald-300" : "text-red-300"}`}>{avgRoi > 0 ? "+" : ""}{avgRoi.toFixed(1)}%</span></span>
        </section>

        <section className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="flex items-center gap-2.5 text-xl font-semibold text-white">
              <span className="inline-block h-5 w-1 rounded-full bg-[var(--brand)]" />
              {periodLabels[period]} standings
            </h3>
            <p className="mt-1 text-sm text-slate-400">Accuracy is the headline. Tap a row for the full breakdown.</p>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--stroke)] bg-[#0b1528]" />
              ))}
            </div>
          ) : topTen.length === 0 ? (
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-200">No ranked analysts for {periodLabels[period].toLowerCase()} yet.</p>
              <p className="mt-1 text-xs text-slate-400">Once predictions resolve this period, the standings appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topTen.map((entry) => {
                const resolved = Number(entry.period_correct_predictions || 0) + Number(entry.period_incorrect_predictions || 0);
                const accuracy = resolved > 0 ? Math.round((Number(entry.period_correct_predictions || 0) / resolved) * 100) : 0;
                const net = Number(entry.period_net_points || 0);
                const roi = Number(entry.period_roi_percent || 0);
                const isExpanded = expandedUser === entry._id;
                const isMe = !!myUsername && entry.username === myUsername;
                const isLeader = entry.rank === 1;
                const avatar = (entry.username || "?").charAt(0).toUpperCase();
                const roiW = Math.min(Math.abs(roi) / maxAbsRoi, 1) * 50;
                const highlight = isMe
                  ? "border-[var(--brand)]/60 bg-[var(--brand)]/[0.06]"
                  : isLeader
                    ? "border-[var(--brand)]/35 bg-[var(--brand)]/[0.05]"
                    : "border-[var(--stroke)] bg-[#0b1528]";
                return (
                  <div key={entry._id} className={`relative overflow-hidden rounded-xl border ${highlight}`}>
                    {isLeader && (
                      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 120% at 8% 0%, rgba(88,166,255,0.16), transparent 55%)" }} />
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : entry._id)}
                      className="relative flex w-full items-center gap-3 p-3.5 text-left sm:gap-4 sm:p-4"
                    >
                      <span className="w-4 flex-none text-center text-xs font-bold text-slate-500">{entry.rank}</span>
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/[0.12] text-sm font-bold text-[var(--brand)]">
                        {avatar}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                          @{entry.username}
                          {isMe && <span className="rounded-full bg-[var(--brand)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]">You</span>}
                        </span>
                        <span className="mt-2 flex items-center gap-2">
                          <span className="relative h-2 w-28 flex-none rounded-full bg-slate-600/15 sm:w-40">
                            <span className="absolute inset-y-0 left-1/2 w-px bg-slate-500/50" />
                            {roi >= 0 ? (
                              <span className="absolute inset-y-0 rounded-full" style={{ left: "50%", width: `${roiW}%`, background: "var(--brand)" }} />
                            ) : (
                              <span className="absolute inset-y-0 rounded-full" style={{ right: "50%", width: `${roiW}%`, background: "var(--no)" }} />
                            )}
                          </span>
                          <span className={`text-[11px] font-medium ${roi >= 0 ? "text-[var(--brand)]" : "text-orange-300"}`}>{roi > 0 ? "+" : ""}{roi.toFixed(0)}% ROI</span>
                        </span>
                      </span>
                      <span className="flex-none text-right">
                        <span className="block text-lg font-bold leading-none text-white sm:text-xl">{accuracy}%</span>
                        <span className="text-[11px] tracking-wide text-slate-500">{resolved > 0 ? `Accuracy · ${resolved} resolved` : "no calls yet"}</span>
                      </span>
                      <span className="ml-4 hidden flex-none text-right sm:block">
                        <span className={`block font-semibold leading-none ${net >= 0 ? "text-emerald-300" : "text-red-300"}`}>{net > 0 ? "+" : ""}{formatNumber(net)}</span>
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">net pts</span>
                      </span>
                      <span className="ml-2 flex-none text-xs text-[var(--brand)]">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="grid gap-2 border-t border-[var(--stroke)] px-3.5 pb-3.5 pt-3 text-xs sm:grid-cols-3 sm:px-4">
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">ROI</p>
                          <p className={`mt-1 font-semibold ${roi >= 0 ? "text-emerald-300" : "text-red-300"}`}>{roi > 0 ? "+" : ""}{roi.toFixed(2)}%</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Net points</p>
                          <p className={`mt-1 font-semibold ${net >= 0 ? "text-emerald-300" : "text-red-300"}`}>{net > 0 ? "+" : ""}{formatNumber(net)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points used</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber((entry.period_resolved_points_spent ?? entry.period_points_spent) || 0)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points earned</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.period_points_earned || 0)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points lost</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.period_points_lost || 0)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Correct / Incorrect</p>
                          <p className="mt-1 font-semibold text-white">{entry.period_correct_predictions || 0} / {entry.period_incorrect_predictions || 0}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Predictions</p>
                          <p className="mt-1 font-semibold text-white">{entry.prediction_count || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
