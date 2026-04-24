"use client";

import { useEffect, useMemo, useState } from "react";
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
      const resolved = Number(row.period_correct_predictions || 0) + Number(row.period_incorrect_predictions || 0);
      const spend = Number(row.period_points_spent || 0);
      const earned = Number(row.period_points_earned || 0);
      const lost = Number(row.period_points_lost || 0);
      const net = Number(row.period_net_points || 0);
      return resolved > 0 || spend > 0 || earned > 0 || lost > 0 || net !== 0;
    });
  }, [rows]);

  const topRow = eligibleRows[0];
  const avgNet = useMemo(() => {
    if (!eligibleRows.length) return 0;
    const total = eligibleRows.reduce((sum, row) => sum + Number(row.period_net_points || 0), 0);
    return total / eligibleRows.length;
  }, [eligibleRows]);
  const avgRoi = useMemo(() => {
    if (!eligibleRows.length) return 0;
    const total = eligibleRows.reduce((sum, row) => sum + Number(row.period_roi_percent || 0), 0);
    return total / eligibleRows.length;
  }, [eligibleRows]);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="leaderboard" showPointsBalance={false} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-5 rounded-3xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-[var(--brand)]/15 px-4 py-2 text-sm font-semibold text-[var(--brand)]">
              Net Rankings
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Leaderboard</h2>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {(["weekly", "monthly", "quarterly"] as Period[]).map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  period === value
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                    : "border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-slate-500"
                }`}
              >
                {periodLabels[value]}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
            <p className="text-sm text-slate-400">Top {periodLabels[period]} Performer</p>
            <p className="mt-1.5 text-xl font-semibold text-white">{topRow?.username || "-"}</p>
            {topRow?.username && (
              <p className="mt-1 text-sm text-slate-400">@{topRow.username}</p>
            )}
            <p className="mt-1 text-sm text-[var(--brand)]">Net {formatNumber(topRow?.period_net_points || 0)} pts</p>
          </div>
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
            <p className="text-sm text-slate-400">Tracked Competitors</p>
            <p className="mt-1.5 text-xl font-semibold text-white">{eligibleRows.length}</p>
            <p className="mt-1 text-sm text-slate-400">Average net {formatNumber(avgNet)} pts</p>
          </div>
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
            <p className="text-sm text-slate-400">Scoring Model</p>
            <p className="mt-1.5 text-xl font-semibold text-white">Earned - Spent</p>
            <p className="mt-1 text-sm text-slate-400">ROI tracks efficiency per point used.</p>
          </div>
        </section>

        <section className="mb-5 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-400">Average ROI ({periodLabels[period]})</p>
            <p className={`text-base font-semibold ${avgRoi >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {avgRoi > 0 ? "+" : ""}{avgRoi.toFixed(2)}%
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-500">ROI = (Net Points / Points Used) x 100</p>
        </section>

        <section className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">{periodLabels[period]} Standings</h3>
              <p className="text-sm text-slate-400">Essential metrics first. Tap a row for deeper breakdown.</p>
            </div>
            <div className="rounded-full bg-[#0b1528] px-3 py-1 text-xs uppercase tracking-wide text-slate-400">
              {periodLabels[period]}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading leaderboard...</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-1">
            <div className="space-y-3">
              {eligibleRows.map((entry) => {
                const totalResolved = Number(entry.period_correct_predictions || 0) + Number(entry.period_incorrect_predictions || 0);
                const accuracy = totalResolved > 0
                  ? Math.round((Number(entry.period_correct_predictions || 0) / totalResolved) * 100)
                  : 0;
                const isExpanded = expandedUser === entry._id;

                return (
                  <div
                    key={entry._id}
                    className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3.5 sm:p-4"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : entry._id)}
                      className="w-full text-left"
                    >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/20 text-xs font-semibold text-[var(--brand)]">
                          #{entry.rank}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{entry.username}</p>
                          <p className="text-xs text-slate-400">@{entry.username}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:w-[480px]">
                        <div className="rounded-lg bg-slate-800/60 px-2.5 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Net</p>
                          <p className={`mt-1 font-semibold ${Number(entry.period_net_points || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {Number(entry.period_net_points || 0) > 0 ? "+" : ""}{formatNumber(entry.period_net_points || 0)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-2.5 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">ROI</p>
                          <p className={`mt-1 font-semibold ${Number(entry.period_roi_percent || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {Number(entry.period_roi_percent || 0) > 0 ? "+" : ""}{Number(entry.period_roi_percent || 0).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-2.5 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Accuracy</p>
                          <p className="mt-1 font-semibold text-white">{accuracy}%</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-2.5 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Details</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--brand)]">{isExpanded ? "Hide" : "View"}</p>
                        </div>
                      </div>
                    </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 grid gap-2 border-t border-[var(--stroke)] pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points earned</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.period_points_earned || 0)} pts</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points spent</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber((entry.period_resolved_points_spent ?? entry.period_points_spent) || 0)} pts</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Points lost</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.period_points_lost || 0)} pts</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Correct</p>
                          <p className="mt-1 font-semibold text-white">{entry.period_correct_predictions || 0}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">Incorrect</p>
                          <p className="mt-1 font-semibold text-white">{entry.period_incorrect_predictions || 0}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <p className="text-slate-500">All-time earned</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.points_earned_total || 0)} pts</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
