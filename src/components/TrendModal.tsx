"use client";

import type { FeedQuestion, HistoryPoint } from "../lib/api";

type Props = {
  question: FeedQuestion | null;
  points: HistoryPoint[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function buildPath(points: HistoryPoint[], width: number, height: number) {
  if (!points.length) return "";

  const yesValues = points.map((p) => Number(p.yes_percent || 0));
  const min = Math.min(...yesValues, 0);
  const max = Math.max(...yesValues, 100);
  const span = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const normalized = (Number(point.yes_percent || 0) - min) / span;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function TrendModal({ question, points, loading, error, onClose }: Props) {
  if (!question) return null;

  const chartPath = buildPath(points, 720, 220);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:max-w-4xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Question Trend</p>
            <h3 className="text-lg font-semibold text-white sm:text-xl">{question.title}</h3>
          </div>
          <button
            className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-sm text-slate-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading history...</p>}
        {error && <p className="text-sm text-amber-300">{error}</p>}

        {!loading && points.length > 0 && (
          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <svg viewBox="0 0 720 260" className="h-48 w-full sm:h-64">
              <line x1="0" y1="220" x2="720" y2="220" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="110" x2="720" y2="110" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="10" x2="720" y2="10" stroke="#1e293b" strokeWidth="1" />
              <path d={chartPath} fill="none" stroke="#58a6ff" strokeWidth="3" />
            </svg>

            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>Start YES: {formatPct(points[0]?.yes_percent || 0)}</span>
              <span>Latest YES: {formatPct(points[points.length - 1]?.yes_percent || 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
