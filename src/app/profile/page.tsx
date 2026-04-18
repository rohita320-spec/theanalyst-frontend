"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { fetchProfile, fetchUserPredictions, type ProfilePayload, type UserPrediction } from "../../lib/api";
import { DEMO_USER_ID } from "../../lib/mockData";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type QuestionGroup = {
  question_id: string;
  question_title: string;
  question_status?: string;
  predictions: UserPrediction[];
};

function groupByQuestion(predictions: UserPrediction[]): QuestionGroup[] {
  const map = new Map<string, QuestionGroup>();
  for (const p of predictions) {
    const key = p.question_id || p._id;
    if (!map.has(key)) {
      map.set(key, {
        question_id: key,
        question_title: p.question_title || key,
        question_status: p.question_status,
        predictions: [],
      });
    }
    map.get(key)!.predictions.push(p);
  }
  return Array.from(map.values());
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [openPredictions, setOpenPredictions] = useState<UserPrediction[]>([]);
  const [closedPredictions, setClosedPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profileData, predictionsData] = await Promise.allSettled([
        fetchProfile(DEMO_USER_ID),
        fetchUserPredictions(DEMO_USER_ID),
      ]);

      if (profileData.status === "fulfilled") {
        setProfile(profileData.value);
      }

      if (predictionsData.status === "fulfilled") {
        setOpenPredictions(predictionsData.value.open || []);
        setClosedPredictions(predictionsData.value.closed || []);
      }

      setLoading(false);
    };

    load();
  }, []);

  const openGroups = useMemo(() => groupByQuestion(openPredictions), [openPredictions]);
  const closedGroups = useMemo(() => groupByQuestion(closedPredictions), [closedPredictions]);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="profile" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <p className="text-sm text-slate-400">Loading profile...</p>
        ) : (
          <>
            {/* Hero */}
            <section className="mb-6 rounded-[2rem] border border-[var(--stroke)] bg-[var(--surface)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="mb-4 inline-flex rounded-full bg-[var(--brand)]/15 px-4 py-2 text-sm font-semibold text-[var(--brand)]">
                    Analyst Profile
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)]/20 text-3xl font-bold text-[var(--brand)]">
                      {(profile?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-3xl font-semibold text-white">{profile?.username || "analyst"}</h2>
                      <p className="text-sm text-slate-400">
                        Answered {formatNumber(profile?.answered_questions_count || 0)} unique questions · net {formatNumber(profile?.net_points || 0)} pts
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Correct / Incorrect</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {profile?.correct_predictions || 0} / {profile?.incorrect_predictions || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Open / Closed</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {profile?.open_analyses_count || 0} / {profile?.closed_analyses_count || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Total Spent</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(profile?.total_points_spent || 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Net Result</p>
                      <p className={`mt-2 text-2xl font-semibold ${Number(profile?.net_points || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {Number(profile?.net_points || 0) > 0 ? "+" : ""}{formatNumber(profile?.net_points || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--stroke)] bg-[#0b1528] p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Performance Snapshot</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Points Balance</span>
                      <span className="font-semibold text-white">{formatNumber(profile?.points_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">All-Time Net Earned</span>
                      <span className="font-semibold text-emerald-300">{formatNumber(profile?.points_earned_total || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Gross Payout Received</span>
                      <span className="font-semibold text-white">{formatNumber(profile?.gross_points_earned || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Points Lost</span>
                      <span className="font-semibold text-red-300">{formatNumber(profile?.total_points_lost || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Open / Closed</span>
                      <span className="font-semibold text-white">
                        {profile?.open_analyses_count || 0} / {profile?.closed_analyses_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary stats */}
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
                <p className="text-sm text-slate-400">Questions Answered</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(profile?.answered_questions_count || 0)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
                <p className="text-sm text-slate-400">Resolved Hit Rate</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {profile && profile.closed_analyses_count > 0
                    ? `${Math.round((profile.correct_predictions / profile.closed_analyses_count) * 100)}%`
                    : "0%"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
                <p className="text-sm text-slate-400">Leaderboard Score</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(profile?.leaderboard_score || 0)}</p>
              </div>
            </section>

            {/* Open questions — grouped by question */}
            <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Open Questions You Answered</h3>
                <span className="rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs font-medium text-[var(--brand)]">
                  {openGroups.length}
                </span>
              </div>

              {openGroups.length === 0 ? (
                <p className="text-sm text-slate-400">No active answers yet.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {openGroups.map((group) => (
                    <div key={group.question_id} className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="mb-3 text-sm font-semibold text-white">{group.question_title}</p>
                      <div className="space-y-2">
                        {group.predictions.map((prediction) => (
                          <div key={prediction._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/40 px-3 py-2.5 text-sm">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                              {prediction.answer.toUpperCase()}
                            </span>
                            <span className="text-slate-300">
                              Spent: <span className="font-semibold text-white">{formatNumber(prediction.points_used)}</span>
                            </span>
                            {prediction.created_at && (
                              <span className="ml-auto text-xs text-slate-500">{formatDate(prediction.created_at)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </section>

            {/* Resolved questions — grouped by question */}
            <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Resolved Questions You Answered</h3>
                <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-medium text-slate-300">
                  {closedGroups.length}
                </span>
              </div>

              {closedGroups.length === 0 ? (
                <p className="text-sm text-slate-400">No resolved answers yet.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {closedGroups.map((group) => (
                    <div key={group.question_id} className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="mb-3 text-sm font-semibold text-white">{group.question_title}</p>
                      <div className="space-y-2">
                        {group.predictions.map((prediction) => {
                          const netResult = Number(prediction.points_earned || 0) - Number(prediction.points_used || 0);
                          return (
                            <div key={prediction._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/40 px-3 py-2.5 text-sm">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                                {prediction.answer.toUpperCase()}
                              </span>
                              <span className="text-slate-300">
                                Spent: <span className="font-semibold text-white">{formatNumber(prediction.points_used)}</span>
                              </span>
                              <span className="text-slate-300">
                                Payout: <span className="font-semibold text-white">{formatNumber(prediction.points_earned)}</span>
                              </span>
                              <span className="text-slate-300">
                                Net: <span className={`font-semibold ${netResult >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                  {netResult > 0 ? "+" : ""}{formatNumber(netResult)}
                                </span>
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.is_correct ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-400"}`}>
                                {prediction.is_correct ? "Correct" : "Incorrect"}
                              </span>
                              {prediction.created_at && (
                                <span className="ml-auto text-xs text-slate-500">{formatDate(prediction.created_at)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

