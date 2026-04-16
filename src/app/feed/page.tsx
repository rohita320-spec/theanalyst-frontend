"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../components/AppHeader";
import QuestionCard from "../../components/QuestionCard";
import TrendModal from "../../components/TrendModal";
import {
  fetchFeedQuestions,
  fetchProfile,
  fetchQuestionHistory,
  type FeedQuestion,
  type HistoryPoint,
  type ProfilePayload,
} from "../../lib/api";
import { DEMO_USER_ID } from "../../lib/mockData";

const categories = [
  "All",
  "Crypto",
  "Economy",
  "Entertainment",
  "General",
  "Global events",
  "Markets",
  "Sports",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedQuestion, setSelectedQuestion] = useState<FeedQuestion | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadData = async (category: string) => {
    setLoading(true);
    const [questionsData, profileData] = await Promise.all([
      fetchFeedQuestions(category),
      fetchProfile(DEMO_USER_ID),
    ]);
    setQuestions(questionsData);
    setProfile(profileData);
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedCategory);
  }, [selectedCategory]);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === "All") return questions;
    return questions.filter((q) => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  const openQuestions = filteredQuestions.filter((q) => q.status === "open").length;
  const totalPool = filteredQuestions.reduce((sum, q) => sum + q.yes_pool + q.no_pool, 0);

  const onOpenChart = async (question: FeedQuestion) => {
    setSelectedQuestion(question);
    setHistoryLoading(true);
    setHistoryError(null);

    const historyPoints = await fetchQuestionHistory(question._id);
    if (!historyPoints.length) {
      setHistoryError("No trend points for this question yet.");
    }
    setHistory(historyPoints);
    setHistoryLoading(false);
  };

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="feed" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Open Questions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{openQuestions}</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Total Active Pool</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(totalPool)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Your Total Earned</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatNumber(profile?.points_earned_total || 0)}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-3 py-2 text-sm sm:px-4 ${
                  selectedCategory === category
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                    : "border-[var(--stroke)] bg-[var(--surface)] text-slate-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading feed...</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredQuestions.map((question) => (
                <QuestionCard key={question._id} question={question} onOpenChart={onOpenChart} />
              ))}
            </div>
          )}
        </section>
      </main>

      <TrendModal
        question={selectedQuestion}
        points={history}
        loading={historyLoading}
        error={historyError}
        onClose={() => setSelectedQuestion(null)}
      />
    </div>
  );
}
