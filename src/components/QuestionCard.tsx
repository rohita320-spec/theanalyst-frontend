"use client";

import type { FeedQuestion } from "../lib/api";

type Props = {
  question: FeedQuestion;
  onOpenChart: (question: FeedQuestion) => void;
  onAnalyze: (question: FeedQuestion, answer: "yes" | "no") => void;
  placing?: string;
  loggedIn?: boolean;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function QuestionCard({ question, onOpenChart, onAnalyze, placing = "", loggedIn = false }: Props) {
  const isOpen = question.status === "open";
  const isPlacingYes = placing === `${question._id}:yes`;
  const isPlacingNo = placing === `${question._id}:no`;
  const isAnyPlacing = isPlacingYes || isPlacingNo;
  const yesWidth = Math.max(0, Math.min(100, Number(question.yes_percent || 0)));
  const noWidth = Math.max(0, Math.min(100, Number(question.no_percent || 0)));

  function getButtonLabel(side: "yes" | "no") {
    if (!isOpen) return "Question Closed";
    if (!loggedIn) return "Login to Participate";
    if (side === "yes" && isPlacingYes) return "Submitting…";
    if (side === "no" && isPlacingNo) return "Submitting…";
    return side === "yes" ? "Add YES" : "Add NO";
  }

  return (
    <article
      className="cursor-pointer rounded-xl border border-[var(--stroke)] bg-[var(--surface-2)] p-3 transition-colors hover:border-slate-600 sm:p-4"
      onClick={() => onOpenChart(question)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 inline-flex rounded-full bg-[var(--brand)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">
            {question.category}
          </p>
          <h2 className="text-sm font-semibold text-white sm:text-base">{question.title}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            isOpen ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/20 text-slate-400"
          }`}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Pool bar */}
      <div className="mb-3 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-3">
        <div className="mb-2 flex flex-col gap-1 text-xs text-slate-300 sm:flex-row sm:justify-between">
          <span>Entry: {formatNumber(Number(question.entry_cost || 0))} pts</span>
          <span>Pool: {formatNumber(Number(question.yes_pool || 0) + Number(question.no_pool || 0))} pts</span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-slate-700">
          <div className="absolute left-0 top-0 h-full bg-[var(--brand)] transition-all" style={{ width: `${yesWidth}%` }} />
          <div className="absolute right-0 top-0 h-full bg-[var(--accent)] transition-all" style={{ width: `${noWidth}%` }} />
        </div>

        <div className="mt-2 flex justify-between text-xs font-medium">
          <span className="text-[var(--brand)]">YES {formatPct(question.yes_percent)}</span>
          <span className="text-[var(--accent)]">NO {formatPct(question.no_percent)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row" onClick={(e) => e.stopPropagation()}>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            !isOpen || !loggedIn
              ? "border border-[var(--stroke)] bg-transparent text-slate-400"
              : "bg-[var(--brand)] text-slate-950 hover:brightness-110"
          }`}
          onClick={() => onAnalyze(question, "yes")}
          disabled={!isOpen || isAnyPlacing}
        >
          {getButtonLabel("yes")}
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            !isOpen || !loggedIn
              ? "border border-[var(--stroke)] bg-transparent text-slate-400"
              : "bg-[var(--accent)] text-slate-950 hover:brightness-110"
          }`}
          onClick={() => onAnalyze(question, "no")}
          disabled={!isOpen || isAnyPlacing}
        >
          {getButtonLabel("no")}
        </button>
      </div>

      <p className="text-[11px] text-slate-400">{question.closes_label || "Closes soon"}</p>
    </article>
  );
}
