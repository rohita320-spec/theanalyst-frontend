"use client";

import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { fetchFeedQuestions, fetchProfile, type FeedQuestion, type ProfilePayload } from "../../lib/api";
import { DEMO_USER_ID } from "../../lib/mockData";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<FeedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profileData, questions] = await Promise.all([
        fetchProfile(DEMO_USER_ID),
        fetchFeedQuestions("All"),
      ]);
      setProfile(profileData);
      setRecentQuestions(questions.slice(0, 3));
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="profile" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <p className="text-sm text-slate-400">Loading profile...</p>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
                <p className="text-sm text-slate-400">Username</p>
                <p className="mt-2 text-2xl font-semibold text-white">{profile?.username || "analyst"}</p>
                <p className="mt-4 text-sm text-slate-400">Leaderboard Score</p>
                <p className="mt-1 text-3xl font-semibold text-[var(--brand)]">
                  {formatNumber(profile?.leaderboard_score || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
                <p className="text-sm text-slate-400">Performance Snapshot</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Points Balance</span>
                    <span className="font-semibold text-white">{formatNumber(profile?.points_balance || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Points Earned</span>
                    <span className="font-semibold text-white">{formatNumber(profile?.points_earned_total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Analyses Submitted</span>
                    <span className="font-semibold text-white">{profile?.analyses_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Open Analyses</span>
                    <span className="font-semibold text-white">{profile?.open_analyses_count || 0}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Recent Open Questions</h2>
              <div className="space-y-3">
                {recentQuestions.map((q) => (
                  <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                    <p className="text-white">{q.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {q.category} • YES {q.yes_percent.toFixed(2)}% • NO {q.no_percent.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
