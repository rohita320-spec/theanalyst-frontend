"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import QuestionCard from "../../components/QuestionCard";
import TrendModal from "../../components/TrendModal";
import {
  ApiError,
  clearStoredAuthSession,
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

const ANALYSIS_TYPES: Record<string, string[]> = {
  crypto: ["Technical Analysis", "Fundamental Analysis", "On-Chain Analysis"],
  markets: ["Technical Analysis", "Fundamental Analysis"],
  economy: ["Macro Analysis", "Historical Trends", "Fundamental Analysis", "Policy Analysis"],
  entertainment: ["Trend Analysis", "Historical Analysis", "Public Opinion"],
  general: ["Logical Reasoning", "Historical Trends", "News/Event-Driven", "Public Opinion"],
  "global events": ["Geopolitical Analysis", "Historical Patterns"],
  sports: ["Statistical Analysis", "Form Analysis", "Historical Head-to-Head"],
};

function getAnalysisTypesForCategory(category: string): string[] {
  return ANALYSIS_TYPES[category.toLowerCase()] ?? [];
}

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

  // Read auth state synchronously to avoid double loadData (once empty, once after useEffect sets it)
  const [authToken, setAuthToken] = useState<string>(() => {
    try { return localStorage.getItem("auth_token") || ""; } catch { return ""; }
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    try { return Boolean(localStorage.getItem("auth_token")); } catch { return false; }
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirm-prediction modal state
  const [confirmModal, setConfirmModal] = useState<{ question: FeedQuestion; answer: "yes" | "no" } | null>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string | null>(null);

  useEffect(() => {
    const syncAuthFromStorage = () => {
      try {
        const token = localStorage.getItem("auth_token") || "";
        setAuthToken(token);
        setLoggedIn(Boolean(token));
      } catch {
        setAuthToken("");
        setLoggedIn(false);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "auth_token" || event.key === "auth_user") {
        syncAuthFromStorage();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", syncAuthFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", syncAuthFromStorage);
    };
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
    if (questionsData.status === "fulfilled") {
      // Hide test-sandbox questions ([TEST] prefix) from the public feed
      setQuestions(questionsData.value.filter((q) => !q.title.startsWith("[TEST]")));
    }
    if (profileData.status === "fulfilled") {
      setProfile(profileData.value?.profile ?? null);
    } else {
      setProfile(null);
      if (
        token
        && profileData.reason instanceof ApiError
        && profileData.reason.status === 401
      ) {
        clearStoredAuthSession("Your session expired. Please login again.");
        setAuthToken("");
        setLoggedIn(false);
      }
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
      showNotification("info", "Please login to place a position.");
      window.location.href = "/auth/login";
      return;
    }

    // Market must be open
    if (question.status !== "open") {
      showNotification("error", "This question is closed for new positions.");
      return;
    }

    // Open confirmation modal
    setConfirmModal({ question, answer });
    setPointsInput(String(Math.max(Number(question.entry_cost || 500), 0)));
    setModalError("");
    setSelectedAnalysisType(null);
  };

  const onConfirmSubmit = async () => {
    if (!confirmModal) return;
    const { question, answer } = confirmModal;
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts <= 0) {
      setModalError("Amount must be greater than zero.");
      return;
    }

    const entryMin = Number(question.entry_cost || 500);
    if (pts < entryMin) {
      setModalError(`Below minimum entry cost (${entryMin} pts).`);
      return;
    }

    const maxAllowed = Math.floor((profile?.points_balance || 10000) * 0.3);
    if (pts > maxAllowed) {
      setModalError(`Exceeds max position limit (${maxAllowed} pts = 30% of your balance).`);
      return;
    }

    setModalSubmitting(true);
    setModalError("");
    const key = `${question._id}:${answer}`;
    setPlacing(key);

    try {
      const result = await placePrediction(authToken, question._id, answer, pts, selectedAnalysisType);
      if (!result.success) {
        setModalError(result.message || "Position could not be submitted.");
        return;
      }
      setConfirmModal(null);
      setSelectedAnalysisType(null);
      showNotification(
        "success",
        `✓ ${answer.toUpperCase()} position submitted! New balance: ${formatNumber(result.new_balance)} pts`,
      );
      await loadData(selectedCategory, authToken || undefined);
      if (selectedQuestion) await onOpenChart(question, timeframe);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStoredAuthSession("Your session expired. Please login again.");
        setAuthToken("");
        setLoggedIn(false);
      }
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

  const closeConfirmModal = () => {
    setConfirmModal(null);
    setModalError("");
    setSelectedAnalysisType(null);
  };

  useEffect(() => {
    if (!confirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirmModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmModal]);

  function handleCursorGlowMove(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    button.style.setProperty("--cursor-x", `${x}px`);
    button.style.setProperty("--cursor-y", `${y}px`);
  }

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="feed" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
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

        {!loggedIn && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <Link href="/auth/login" className="rounded-md border border-[var(--stroke)] px-3 py-1.5 text-xs text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">
              Log in
            </Link>
            <Link href="/auth/signup" className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110">
              Join Now
            </Link>
          </div>
        )}

        <section className="mb-5 grid gap-3 grid-cols-2 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5 transition-colors hover:border-slate-500/60">
            <p className="text-sm text-slate-400">Open Questions</p>
            <p className="mt-1.5 text-2xl font-semibold text-emerald-300">{openQuestions}</p>
          </div>
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5 transition-colors hover:border-slate-500/60">
            <p className="text-sm text-slate-400">Active Points</p>
            <p className="mt-1.5 text-2xl font-semibold text-[var(--brand)]">{formatNumber(totalPool)}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5 transition-colors hover:border-slate-500/60 md:col-span-1">
            <p className="text-sm text-slate-400">Closed / Resolved</p>
            <p className="mt-1.5 text-2xl font-semibold">
              <span className="text-slate-200">{closedQuestions}</span>
              <span className="text-slate-600"> / </span>
              <span className="text-purple-300">{resolvedQuestions}</span>
            </p>
          </div>
        </section>

        <section>
          {/* Category filter */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                onMouseMove={handleCursorGlowMove}
                className={`cursor-glow-button rounded-full border px-3 py-1.5 text-sm transition-colors sm:px-4 ${
                  selectedCategory === category
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                    : "border-[var(--stroke)] bg-[var(--surface)] text-slate-300 hover:border-slate-500"
                }`}
              >
                <span className="cursor-glow-layer" />
                <span className="cursor-shimmer-layer" />
                <span className="cursor-glow-content">{category}</span>
              </button>
            ))}
          </div>

          {/* Status filter — segmented control, visually separate from category pills */}
          <div className="mb-5 flex items-center gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-1 w-fit">
            {(["open", "closed", "resolved", "all"] as const).map((s) => {
              const counts: Record<string, number> = { open: openQuestions, closed: closedQuestions, resolved: resolvedQuestions, all: questions.length };
              const activeColors: Record<string, string> = {
                open:     "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                closed:   "bg-slate-500/20 text-slate-200 border border-slate-500/30",
                resolved: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
                all:      "bg-[var(--brand)]/20 text-[var(--brand)] border border-[var(--brand)]/30",
              };
              const isActive = selectedStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    isActive ? activeColors[s] : "border border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? "bg-white/15" : "bg-slate-700/60 text-slate-400"}`}>
                    {counts[s]}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-[var(--stroke)]/70 bg-[var(--surface-2)] p-3">
                  <div className="mb-3 flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-slate-700/40" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-3/4 rounded bg-slate-700/40" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-700/30" />
                    </div>
                  </div>
                  <div className="mb-3 h-1.5 w-full rounded-full bg-slate-700/30" />
                  <div className="flex gap-1.5">
                    <div className="h-7 flex-1 rounded-md bg-slate-700/30" />
                    <div className="h-7 flex-1 rounded-md bg-slate-700/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-200">
                No {selectedStatus !== "all" ? selectedStatus : ""} questions{selectedCategory !== "All" ? ` in ${selectedCategory}` : ""} right now.
              </p>
              <p className="mt-1 text-xs text-slate-400">Try a different category or status filter.</p>
              {(selectedCategory !== "All" || selectedStatus !== "open") && (
                <button
                  onClick={() => { setSelectedCategory("All"); setSelectedStatus("open"); }}
                  className="mt-4 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-4 py-2 text-xs font-semibold text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div>
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
        <div onClick={closeConfirmModal} className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-md rounded-2xl border border-[var(--stroke)] bg-[#0d1b2e] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Confirm Position</p>
                <h2 className="mt-1 text-base font-semibold text-white line-clamp-2">{confirmModal.question.title}</h2>
              </div>
              <button
                onClick={() => { setConfirmModal(null); setModalError(""); setSelectedAnalysisType(null); }}
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
                {selectedSideLabel}
              </span>
            </div>

            {/* Analysis type picker */}
            {(() => {
              const types = getAnalysisTypesForCategory(confirmModal.question.category);
              if (!types.length) return null;
              return (
                <div className="mb-5">
                  <p className="mb-2 text-sm font-medium text-slate-300">Analysis type <span className="text-slate-500 font-normal">(optional)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedAnalysisType(selectedAnalysisType === t ? null : t)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selectedAnalysisType === t
                            ? "border-[var(--brand)] bg-[var(--brand)]/20 text-[var(--brand)]"
                            : "border-[var(--stroke)] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Points input */}
            <div className="mb-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Position size (points)
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
                onClick={() => { setConfirmModal(null); setModalError(""); setSelectedAnalysisType(null); }}
                className="flex-1 rounded-xl border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSubmit}
                disabled={modalSubmitting}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-950 transition-all hover:brightness-110 disabled:opacity-50 ${
                  confirmModal.answer === "yes" ? "bg-[var(--yes)]" : "bg-[var(--no)]"
                }`}
              >
                {modalSubmitting ? "Submitting..." : "Submit Position"}
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
        onAnalyze={onAnalyze}
        placing={placing}
        closeOnEsc={!confirmModal}
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
