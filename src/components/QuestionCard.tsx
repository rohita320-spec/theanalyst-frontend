"use client";

import type { FeedQuestion } from "../lib/api";

type Props = {
  question: FeedQuestion;
  onOpenChart: (question: FeedQuestion) => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function QuestionCard({ question, onOpenChart }: Props) {
  return (
    <article
      className="cursor-pointer rounded-2xl border border-[var(--stroke)] bg-[var(--surface-2)] p-4 sm:p-6"
      onClick={() => onOpenChart(question)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs font-medium text-[var(--brand)]">
            {question.category}
          </p>
          <h2 className="text-lg font-semibold text-white sm:text-xl">{question.title}</h2>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          {question.status === "open" ? "Open" : "Closed"}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
        <div className="mb-3 flex flex-col gap-1 text-sm text-slate-300 sm:flex-row sm:justify-between">
          <span>Entry Cost: {question.entry_cost}</span>
          <span>Pool: {formatNumber(Number(question.yes_pool || 0) + Number(question.no_pool || 0))}</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full bg-[var(--brand)]" style={{ width: `${question.yes_percent}%` }} />
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-[var(--brand)]">YES {formatPct(question.yes_percent)}</span>
          <span className="text-[var(--accent)]">NO {formatPct(question.no_percent)}</span>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <button className="flex-1 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-110">
          Analyze YES
        </button>
        <button className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-110">
          Analyze NO
        </button>
      </div>

      <p className="text-xs text-slate-400">{question.closes_label || "Closes soon"}</p>
    </article>
  );
}
