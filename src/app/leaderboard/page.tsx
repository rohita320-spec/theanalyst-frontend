"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { fetchLeaderboard, fetchMeProfileSummary, type LeaderboardRow, type ProfilePayload } from "../../lib/api";

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
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("weekly");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const token = typeof window === "undefined" ? undefined : (localStorage.getItem("auth_token") || undefined);
      const [leaderboardRows, profileData] = await Promise.allSettled([
        fetchLeaderboard(period),
        fetchMeProfileSummary(token),
      ]);

      if (leaderboardRows.status === "fulfilled") {
        setRows(leaderboardRows.value);
      }

      if (profileData.status === "fulfilled") {
        setProfile(profileData.value.profile);
      }

      setLoading(false);
    };

    load();
  }, [period]);

  const topRow = rows[0];
  const avgNet = useMemo(() => {
    if (!rows.length) return 0;
    const total = rows.reduce((sum, row) => sum + Number(row.period_net_points || 0), 0);
    return total / rows.length;
  }, [rows]);
  const avgRoi = useMemo(() => {
    if (!rows.length) return 0;
    const total = rows.reduce((sum, row) => sum + Number(row.period_roi_percent || 0), 0);
    return total / rows.length;
  }, [rows]);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="leaderboard" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-6 rounded-[2rem] border border-[var(--stroke)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-[var(--brand)]/15 px-4 py-2 text-sm font-semibold text-[var(--brand)]">
              Net Rankings
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Leaderboard</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-lg">
              Ranked by net performance for the selected period. Only users with resolved prediction participation are included. Score = points earned minus points used, so positive and negative outcomes both matter.
            </p>
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

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Top {periodLabels[period]} Performer</p>
            <p className="mt-2 text-2xl font-semibold text-white">{topRow?.username || "-"}</p>
            {topRow?.username && (
              <p className="mt-1 text-sm text-slate-400">@{topRow.username}</p>
            )}
            <p className="mt-1 text-sm text-[var(--brand)]">Net {formatNumber(topRow?.period_net_points || 0)} pts</p>
            <p className="mt-1 text-sm text-slate-400">Live balance {formatNumber(topRow?.points_balance || 0)} pts</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Tracked Competitors</p>
            <p className="mt-2 text-2xl font-semibold text-white">{rows.length}</p>
            <p className="mt-1 text-sm text-slate-400">Average net {formatNumber(avgNet)} pts</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Scoring Model</p>
            <p className="mt-2 text-2xl font-semibold text-white">Earned - Spent</p>
            <p className="mt-1 text-sm text-slate-400">ROI tracks efficiency per point used.</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-400">Average ROI ({periodLabels[period]})</p>
            <p className={`text-base font-semibold ${avgRoi >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {avgRoi > 0 ? "+" : ""}{avgRoi.toFixed(2)}%
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-500">ROI = (Net Points / Points Used) x 100</p>
        </section>

        <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-white">{periodLabels[period]} Standings</h3>
              <p className="text-sm text-slate-400">Top performance view with live balance, spend, ROI, and hit rate.</p>
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
              {rows.map((entry) => {
                const totalResolved = Number(entry.period_correct_predictions || 0) + Number(entry.period_incorrect_predictions || 0);
                const accuracy = totalResolved > 0
                  ? Math.round((Number(entry.period_correct_predictions || 0) / totalResolved) * 100)
                  : 0;

                return (
                  <div
                    key={entry._id}
                    className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/20 text-sm font-semibold text-[var(--brand)]">
                          #{entry.rank}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">{entry.username}</p>
                          <p className="text-sm text-slate-400">@{entry.username} · All-time points earned {formatNumber(entry.points_earned_total)}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-6">
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Balance</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.points_balance || 0)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Net</p>
                          <p className={`mt-1 font-semibold ${Number(entry.period_net_points || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {Number(entry.period_net_points || 0) > 0 ? "+" : ""}{formatNumber(entry.period_net_points || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Earned</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(entry.period_points_earned || 0)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Spent / Lost</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatNumber(entry.period_points_spent || 0)} / {formatNumber(entry.period_points_lost || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">ROI</p>
                          <p className={`mt-1 font-semibold ${Number(entry.period_roi_percent || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {Number(entry.period_roi_percent || 0) > 0 ? "+" : ""}{Number(entry.period_roi_percent || 0).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Accuracy</p>
                          <p className="mt-1 font-semibold text-white">
                            {accuracy}%
                            <span className="ml-1 text-xs text-slate-400">
                              ({entry.period_correct_predictions || 0}/{totalResolved})
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
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
