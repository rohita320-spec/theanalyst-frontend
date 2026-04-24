"use client";

import type { FeedQuestion } from "../lib/api";
import { getQuestionLogos, getQuestionSideLabels } from "../lib/marketPreview";

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
  const isResolved = question.status === "resolved";
  const canAnalyze = isOpen;

  const isPlacingYes = placing === `${question._id}:yes`;
  const isPlacingNo = placing === `${question._id}:no`;
  const isAnyPlacing = isPlacingYes || isPlacingNo;
  const rawYes = Number(question.yes_percent ?? 50);
  const rawNo = question.no_percent == null ? 100 - rawYes : Number(question.no_percent);
  const safeYes = Math.max(0, Math.min(100, rawYes));
  const safeNo = Math.max(0, Math.min(100, rawNo));
  const widthTotal = safeYes + safeNo;
  const yesWidth = widthTotal > 0 ? (safeYes / widthTotal) * 100 : 50;
  const noWidth = 100 - yesWidth;
  const sideLabels = getQuestionSideLabels(question);
  const logos = getQuestionLogos(question).slice(0, 4);

  function statusBadge() {
    if (isResolved) return { label: "Resolved", cls: "status-resolved" };
    if (!isOpen) return { label: "Closed", cls: "status-closed" };
    return { label: "Open", cls: "status-open" };
  }

  const badge = statusBadge();

  function getButtonLabel(side: "yes" | "no") {
    if (isResolved) return "Resolved";
    if (!isOpen) return "Closed";
    if (!loggedIn) {
      const sideLabel = side === "yes" ? sideLabels.yesLabel : sideLabels.noLabel;
      return `Pick ${sideLabel}`;
    }
    if (side === "yes" && isPlacingYes) return "Submitting…";
    if (side === "no" && isPlacingNo) return "Submitting…";
    const sideLabel = side === "yes" ? sideLabels.yesLabel : sideLabels.noLabel;
    return `Pick ${sideLabel}`;
  }

  return (
    <article
      className="cursor-pointer rounded-2xl border border-[var(--stroke)]/70 bg-[var(--surface-2)] p-4 transition-colors hover:border-slate-500 sm:p-5"
      onClick={() => onOpenChart(question)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full bg-[var(--brand)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">
              {question.category}
            </p>
            {logos.length > 0 && (
              <div className="flex items-center gap-1">
                {logos.map((logo, idx) => (
                  <img
                    key={`${question._id}-logo-${idx}`}
                    src={logo.url}
                    alt={`${logo.label || "Entity"} logo`}
                    className="h-6 w-6 rounded-full border border-white/10 bg-slate-800 object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
          <h2 className="text-base font-semibold leading-snug text-white sm:text-lg">{question.title}</h2>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Pool bar */}
      <div className="mb-4 rounded-xl border border-[var(--stroke)]/70 bg-[#0b1528] p-3.5">
        <div className="mb-2 flex flex-col gap-1 text-xs text-slate-300 sm:flex-row sm:justify-between">
          <span>Entry: {formatNumber(Number(question.entry_cost || 0))} pts</span>
          <span>Pool: {formatNumber(Number(question.yes_pool || 0) + Number(question.no_pool || 0))} pts</span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-slate-700">
          <div className="absolute left-0 top-0 h-full bg-[var(--yes)] transition-all" style={{ width: `${yesWidth}%` }} />
          <div className="absolute right-0 top-0 h-full bg-[var(--no)] transition-all" style={{ width: `${noWidth}%` }} />
        </div>

        <div className="mt-2 flex justify-between text-xs font-medium">
          <span className="text-[var(--yes)]">{sideLabels.yesLabel} {formatPct(safeYes)}</span>
          <span className="text-[var(--no)]">{sideLabels.noLabel} {formatPct(safeNo)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-1 flex flex-col gap-2 sm:flex-row" onClick={(e) => e.stopPropagation()}>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            !canAnalyze || !loggedIn
              ? "border border-[var(--stroke)] bg-transparent text-slate-400"
              : "bg-[var(--yes)] text-slate-950 hover:brightness-110"
          }`}
          onClick={() => onAnalyze(question, "yes")}
          disabled={!canAnalyze || isAnyPlacing}
        >
          {getButtonLabel("yes")}
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            !canAnalyze || !loggedIn
              ? "border border-[var(--stroke)] bg-transparent text-slate-400"
              : "bg-[var(--no)] text-slate-950 hover:brightness-110"
          }`}
          onClick={() => onAnalyze(question, "no")}
          disabled={!canAnalyze || isAnyPlacing}
        >
          {getButtonLabel("no")}
        </button>
      </div>

      {!loggedIn && isOpen && (
        <p className="mb-2 text-center text-[11px] text-slate-400">Login to participate</p>
      )}

      <button
        onClick={(event) => {
          event.stopPropagation();
          onOpenChart(question);
        }}
        className="mb-3 w-full rounded-lg bg-[#3382f6] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Open Market View
      </button>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{question.closes_label || "Closes soon"}</p>
        <span className="text-xs text-[var(--brand)]">View details →</span>
      </div>
    </article>
  );
}
