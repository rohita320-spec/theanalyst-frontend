"use client";

import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { fetchLeaderboard, fetchProfile, type LeaderboardRow, type ProfilePayload } from "../../lib/api";
import { DEMO_USER_ID } from "../../lib/mockData";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [leaderboardRows, profileData] = await Promise.all([
        fetchLeaderboard(),
        fetchProfile(DEMO_USER_ID),
      ]);
      setRows(leaderboardRows);
      setProfile(profileData);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="leaderboard" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
          <h2 className="mb-5 text-2xl font-semibold text-white">Leaderboard</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading leaderboard...</p>
          ) : (
            <div className="space-y-3">
              {rows.map((entry) => (
                <div
                  key={entry._id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]/20 text-sm font-semibold text-[var(--brand)]">
                      #{entry.rank}
                    </div>
                    <div>
                      <p className="font-medium text-white">{entry.username}</p>
                      <p className="text-xs text-slate-400">Score: {formatNumber(entry.leaderboard_score)}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-white">{formatNumber(entry.points_balance)}</p>
                    <p className="text-xs text-slate-400">Earned: {formatNumber(entry.points_earned_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
