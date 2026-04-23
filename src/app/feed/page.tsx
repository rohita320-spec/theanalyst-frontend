"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../../components/AppHeader";
import QuestionCard from "../../components/QuestionCard";
import TrendModal from "../../components/TrendModal";
import {
  fetchFeedQuestions,
  fetchMeProfileSummary,
  placePrediction,
  fetchQuestionHistory,
  type FeedQuestion,
  type HistoryPoint,
  type ProfilePayload,
} from "../../lib/api";
import { buildPredictionPreview, getAnswerDisplayLabel, getQuestionSideLabels } from "../../lib/marketPreview";
import { getQuestionViewStatus } from "../../lib/questionStatus";

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

type Notification = { type: "success" | "error" | "info"; text: string };

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatSignedNumber(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value)}`;
}

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<"open" | "closed" | "resolved" | "all">("open");
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedQuestion, setSelectedQuestion] = useState<FeedQuestion | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"hourly" | "daily" | "all">("all");
  const [placing, setPlacing] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirm-prediction modal state
  const [confirmModal, setConfirmModal] = useState<{ question: FeedQuestion; answer: "yes" | "no" } | null>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Read auth state from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem("auth_token");
      setAuthToken(token || "");
      setLoggedIn(!!token);
    } catch {
      setAuthToken("");
      setLoggedIn(false);
    }
  }, []);

  function showNotification(type: Notification["type"], text: string) {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification({ type, text });
    notifTimerRef.current = setTimeout(() => setNotification(null), 4500);
  }

  const loadData = async (category: string, token?: string) => {
    setLoading(true);
    const [questionsData, profileData] = await Promise.allSettled([
      fetchFeedQuestions(category, "all"),
      token ? fetchMeProfileSummary(token) : Promise.resolve(null),
    ]);
    if (questionsData.status === "fulfilled") setQuestions(questionsData.value);
    if (profileData.status === "fulfilled") {
      setProfile(profileData.value?.profile ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedCategory, authToken || undefined);
  }, [selectedCategory, authToken]);

  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (selectedCategory !== "All") result = result.filter((q) => q.category === selectedCategory);
    if (selectedStatus !== "all") result = result.filter((q) => getQuestionViewStatus(q) === selectedStatus);
    return result;
  }, [questions, selectedCategory, selectedStatus]);

  const openQuestions = questions.filter((q) => getQuestionViewStatus(q) === "open").length;
  const closedQuestions = questions.filter((q) => getQuestionViewStatus(q) === "closed").length;
  const resolvedQuestions = questions.filter((q) => getQuestionViewStatus(q) === "resolved").length;
  const totalPool = questions.filter((q) => q.status === "open").reduce((sum, q) => sum + q.yes_pool + q.no_pool, 0);

  const onOpenChart = async (question: FeedQuestion, tf: "hourly" | "daily" | "all" = timeframe) => {
    setSelectedQuestion(question);
    setHistoryLoading(true);
    setHistoryError(null);

    const historyPoints = await fetchQuestionHistory(question._id, tf);
    if (!historyPoints.length) {
      setHistoryError("No trend data for this question yet.");
    }
    setHistory(historyPoints);
    setHistoryLoading(false);
  };

  const onAnalyze = (question: FeedQuestion, answer: "yes" | "no") => {
    // Auth gate
    if (!loggedIn) {
      showNotification("info", "Please login to submit an analysis.");
      window.location.href = "/auth/login";
      return;
    }

    // Market must be open
    if (question.status !== "open") {
      showNotification("error", "This question is closed for new analyses.");
      return;
    }

    // Open confirmation modal
    setConfirmModal({ question, answer });
    setPointsInput(String(Math.max(Number(question.entry_cost || 500), 0)));
    setModalError("");
  };

  const onConfirmSubmit = async () => {
    if (!confirmModal) return;
    const { question, answer } = confirmModal;
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts <= 0) {
      setModalError("Points to spend must be greater than zero.");
      return;
    }

    const entryMin = Number(question.entry_cost || 500);
    if (pts < entryMin) {
      setModalError(`Below minimum entry cost (${entryMin} pts).`);
      return;
    }

    const maxAllowed = Math.floor((profile?.points_balance || 10000) * 0.3);
    if (pts > maxAllowed) {
      setModalError(`Exceeds max analysis limit (${maxAllowed} pts = 30% of your balance).`);
      return;
    }

    setModalSubmitting(true);
    setModalError("");
    const key = `${question._id}:${answer}`;
    setPlacing(key);

    try {
      const result = await placePrediction(authToken, question._id, answer, pts);
      if (!result.success) {
        setModalError(result.message || "Analysis could not be submitted.");
        return;
      }
      setConfirmModal(null);
      showNotification(
        "success",
        `✓ ${answer.toUpperCase()} analysis submitted! New balance: ${formatNumber(result.new_balance)} pts`,
      );
      await loadData(selectedCategory, authToken || undefined);
      if (selectedQuestion) await onOpenChart(question, timeframe);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Submission failed. Check backend.");
    } finally {
      setModalSubmitting(false);
      setPlacing("");
    }
  };

  const previewPoints = parseInt(pointsInput, 10);
  const preview = confirmModal && Number.isFinite(previewPoints)
    ? buildPredictionPreview(confirmModal.question, confirmModal.answer, previewPoints)
    : null;
  const selectedSideLabel = confirmModal ? getAnswerDisplayLabel(confirmModal.question, confirmModal.answer) : "";
  const confirmSideLabels = confirmModal ? getQuestionSideLabels(confirmModal.question) : null;

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="feed" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Notification banner */}
        {notification && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
              notification.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : notification.type === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]"
            }`}
          >
            {notification.text}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Open Questions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{openQuestions}</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Active Pool</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(totalPool)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
            <p className="text-sm text-slate-400">Closed / Resolved</p>
            <p className="mt-2 text-3xl font-semibold text-white">{closedQuestions} / {resolvedQuestions}</p>
          </div>
        </section>

        <section>
          {/* Category filter */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors sm:px-4 ${
                  selectedCategory === category
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                    : "border-[var(--stroke)] bg-[var(--surface)] text-slate-300 hover:border-slate-500"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="mb-5 flex items-center gap-2">
            {(["open", "closed", "resolved", "all"] as const).map((s) => {
              const counts: Record<string, number> = { open: openQuestions, closed: closedQuestions, resolved: resolvedQuestions, all: questions.length };
              const colors: Record<string, string> = {
                open: selectedStatus === s ? "feed-status-tab-active-open" : "feed-status-tab",
                closed: selectedStatus === s ? "feed-status-tab-active-closed" : "feed-status-tab",
                resolved: selectedStatus === s ? "feed-status-tab-active-resolved" : "feed-status-tab",
                all: selectedStatus === s ? "feed-status-tab-active-all" : "feed-status-tab",
              };
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${colors[s]}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading feed...</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="text-sm text-slate-400">No {selectedStatus !== "all" ? selectedStatus : ""} questions{selectedCategory !== "All" ? ` in ${selectedCategory}` : ""} right now.</p>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid gap-5 lg:grid-cols-2">
                {filteredQuestions.map((question) => {
                  const isPastClose = question.closing_time && new Date(question.closing_time) < new Date();
                  const isStillOpen = question.status === "open";
                  return (
                    <div key={question._id}>
                      {isPastClose && isStillOpen && (
                        <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
                          ⚠ Past closing time — submissions remain open until the admin closes this question
                        </div>
                      )}
                      <QuestionCard
                        question={question}
                        onOpenChart={onOpenChart}
                        onAnalyze={onAnalyze}
                        placing={placing}
                        loggedIn={loggedIn}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Confirm Prediction Modal ───────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--stroke)] bg-[#0d1b2e] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Confirm Analysis</p>
                <h2 className="mt-1 text-base font-semibold text-white line-clamp-2">{confirmModal.question.title}</h2>
              </div>
              <button
                onClick={() => { setConfirmModal(null); setModalError(""); }}
                className="mt-0.5 flex-none rounded-lg p-1.5 text-slate-500 hover:bg-slate-700/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Selected answer badge */}
            <div className="mb-5 flex items-center gap-2">
              <span className="text-sm text-slate-400">Your answer:</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  confirmModal.answer === "yes"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {selectedSideLabel} ({confirmModal.answer.toUpperCase()})
              </span>
            </div>

            {/* Points input */}
            <div className="mb-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Points to spend
              </label>
              <input
                type="number"
                min={Number(confirmModal.question.entry_cost || 500)}
                step="1"
                value={pointsInput}
                onChange={(e) => { setPointsInput(e.target.value); setModalError(""); }}
                placeholder="Enter points"
                className="w-full rounded-xl border border-[var(--stroke)] bg-[#0b1528] px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
              />
            </div>

            {/* Min / Max hints */}
            <div className="mb-4 space-y-1 text-xs text-slate-500">
              <p>Minimum entry: <span className="text-slate-300">{Number(confirmModal.question.entry_cost || 500).toLocaleString()} pts</span></p>
              <p>
                Max allowed:{" "}
                <span className="text-slate-300">
                  {Math.floor((profile?.points_balance || 10000) * 0.3).toLocaleString()} pts
                </span>{" "}
                <span className="text-slate-600">(30% of your balance)</span>
              </p>
              <p>Your balance: <span className="text-slate-300">{(profile?.points_balance || 0).toLocaleString()} pts</span></p>
            </div>

            {preview && confirmSideLabels && (
              <div className="mb-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Avg entry price</p>
                    <p className="mt-1 font-semibold text-white">{formatNumber(preview.avgEntryPrice)} pts/share</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Shares received</p>
                    <p className="mt-1 font-semibold text-white">{preview.sharesReceived.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Projected {confirmSideLabels.yesLabel}</p>
                    <p className="mt-1 font-semibold text-emerald-300">{preview.projectedYesPercent.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Projected {confirmSideLabels.noLabel}</p>
                    <p className="mt-1 font-semibold text-orange-300">{preview.projectedNoPercent.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Projected pool</p>
                    <p className="mt-1 font-semibold text-white">{formatNumber(preview.projectedTotalPool)} pts</p>
                  </div>
                  <div>
                    <p className="text-slate-500">If {selectedSideLabel} wins now</p>
                    <p className="mt-1 font-semibold text-white">{formatNumber(preview.immediateWinPayoutEstimate)} pts</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Immediate win P/L</p>
                    <p className={`mt-1 font-semibold ${preview.immediateWinProfitEstimate >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {formatSignedNumber(preview.immediateWinProfitEstimate)} pts
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  This preview uses the current engine exactly. Final payout changes if more points enter either side before resolution.
                </p>
              </div>
            )}

            {/* Error message */}
            {modalError && (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {modalError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmModal(null); setModalError(""); }}
                className="flex-1 rounded-xl border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSubmit}
                disabled={modalSubmitting}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  confirmModal.answer === "yes"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-[var(--no)] text-slate-950 hover:brightness-110"
                }`}
              >
                {modalSubmitting ? "Submitting..." : "Submit Analysis"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TrendModal
        question={selectedQuestion}
        points={history}
        loading={historyLoading}
        error={historyError}
        timeframe={timeframe}
        onChangeTimeframe={(value) => {
          setTimeframe(value);
          if (selectedQuestion) {
            onOpenChart(selectedQuestion, value);
          }
        }}
        onClose={() => setSelectedQuestion(null)}
      />
    </div>
  );
}
