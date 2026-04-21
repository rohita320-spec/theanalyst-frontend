"use client";

import type { FeedQuestion, HistoryPoint } from "../lib/api";

type Props = {
  question: FeedQuestion | null;
  points: HistoryPoint[];
  loading: boolean;
  error: string | null;
  timeframe: "hourly" | "daily" | "all";
  onChangeTimeframe: (value: "hourly" | "daily" | "all") => void;
  onClose: () => void;
};

// SVG chart constants
const W = 760;
const H = 290;
const ML = 52; // left margin (y-axis labels)
const MR = 16; // right margin
const MT = 20; // top margin
const MB = 50; // bottom margin (x-axis labels)
const CW = W - ML - MR; // chart width = 692
const CH = H - MT - MB; // chart height = 220

function pctToY(pct: number) {
  return MT + (1 - pct / 100) * CH;
}

function indexToX(i: number, n: number) {
  return ML + (i / Math.max(n - 1, 1)) * CW;
}

function buildSeriesPath(points: HistoryPoint[], field: "yes_percent" | "no_percent") {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const x = ML + CW / 2;
    const y = pctToY(Number(points[0][field] || 0));
    return `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + 1).toFixed(1)} ${y.toFixed(1)}`;
  }
  return points
    .map((p, i) => {
      const x = indexToX(i, points.length);
      const y = pctToY(Number(p[field] || 0));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(points: HistoryPoint[], field: "yes_percent" | "no_percent") {
  if (points.length < 2) return "";
  const line = buildSeriesPath(points, field);
  const lastX = indexToX(points.length - 1, points.length);
  const baseY = (MT + CH).toFixed(1);
  return `${line} L${lastX.toFixed(1)} ${baseY} L${ML.toFixed(1)} ${baseY} Z`;
}

function formatDateLabel(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

const Y_TICKS = [0, 25, 50, 75, 100];

export default function TrendModal({
  question,
  points,
  loading,
  error,
  timeframe,
  onChangeTimeframe,
  onClose,
}: Props) {
  if (!question) return null;

  const yesPath = buildSeriesPath(points, "yes_percent");
  const noPath = buildSeriesPath(points, "no_percent");
  const yesAreaPath = buildAreaPath(points, "yes_percent");

  // Pick up to 5 evenly-spaced x-axis label indices
  const xLabelIndices: number[] = [];
  if (points.length > 0) {
    const maxLabels = Math.min(5, points.length);
    for (let k = 0; k < maxLabels; k++) {
      xLabelIndices.push(Math.round((k / (maxLabels - 1 || 1)) * (points.length - 1)));
    }
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--stroke)] bg-[var(--surface)] p-4 sm:max-w-4xl sm:rounded-2xl sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">Question Trend</p>
            <h3 className="truncate text-base font-semibold text-white sm:text-xl">{question.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-1 text-xs sm:text-sm">
              {(["hourly", "daily", "all"] as const).map((tf) => (
                <button
                  key={tf}
                  className={`rounded px-2 py-1 capitalize transition-colors ${timeframe === tf ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-300 hover:text-white"}`}
                  onClick={() => onChangeTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button
              className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-sm text-slate-300 hover:border-slate-400 hover:text-white"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Latest stats row */}
        {!loading && lastPoint && (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Current YES</p>
              <p className="mt-1 text-lg font-semibold text-[var(--yes)]">{formatPct(lastPoint.yes_percent)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Current NO</p>
              <p className="mt-1 text-lg font-semibold text-[var(--no)]">{formatPct(lastPoint.no_percent)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Start YES</p>
              <p className="mt-1 text-lg font-semibold text-slate-300">{formatPct(firstPoint?.yes_percent || 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Data Points</p>
              <p className="mt-1 text-lg font-semibold text-slate-300">{points.length}</p>
            </div>
          </div>
        )}

        {loading && <p className="py-8 text-center text-sm text-slate-400">Loading history...</p>}
        {error && <p className="py-4 text-center text-sm text-amber-300">{error}</p>}

        {/* Chart */}
        {!loading && points.length > 0 && (
          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
            {/* Legend */}
            <div className="mb-3 flex items-center gap-4 px-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-[var(--yes)]" />
                YES %
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-[var(--no)]" />
                NO %
              </span>
            </div>

            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-56 w-full sm:h-72"
              style={{ overflow: "visible" }}
            >
              {/* Y-axis grid lines + labels */}
              {Y_TICKS.map((pct) => {
                const y = pctToY(pct);
                return (
                  <g key={pct}>
                    <line
                      x1={ML}
                      y1={y}
                      x2={W - MR}
                      y2={y}
                      stroke={pct === 50 ? "#334155" : "#1e293b"}
                      strokeWidth={pct === 50 ? 1.5 : 1}
                      strokeDasharray={pct === 50 ? "4,3" : undefined}
                    />
                    <text
                      x={ML - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="11"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* Y-axis border line */}
              <line x1={ML} y1={MT} x2={ML} y2={MT + CH} stroke="#334155" strokeWidth="1" />

              {/* X-axis labels */}
              {xLabelIndices.map((idx) => {
                const x = indexToX(idx, points.length);
                const label = formatDateLabel(points[idx].timestamp);
                return (
                  <text
                    key={idx}
                    x={x}
                    y={H - MB + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                  >
                    {label}
                  </text>
                );
              })}

              {/* X-axis border line */}
              <line x1={ML} y1={MT + CH} x2={W - MR} y2={MT + CH} stroke="#334155" strokeWidth="1" />

              {/* YES area fill */}
              {yesAreaPath && (
                <path d={yesAreaPath} fill="#34d399" fillOpacity="0.08" />
              )}

              {/* NO line */}
              <path
                d={noPath}
                fill="none"
                stroke="#fb923c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6,3"
              />

              {/* YES line (on top) */}
              <path
                d={yesPath}
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data point dots for YES */}
              {points.map((p, i) => {
                const x = indexToX(i, points.length);
                const y = pctToY(Number(p.yes_percent || 0));
                return <circle key={`y${i}`} cx={x} cy={y} r="3.5" fill="#34d399" />;
              })}

              {/* Data point dots for NO */}
              {points.map((p, i) => {
                const x = indexToX(i, points.length);
                const y = pctToY(Number(p.no_percent || 0));
                return <circle key={`n${i}`} cx={x} cy={y} r="3" fill="#fb923c" />;
              })}
            </svg>
          </div>
        )}

        {/* ── Resolution Rules ─────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Resolution Rules</h4>
          {question.resolution_rules ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{question.resolution_rules}</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-400">
              <p>This question will be resolved based on publicly verifiable data at the stated closing time. The admin will determine the outcome according to the resolution criteria and make a final determination.</p>
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠ Specific resolution rules have not been set for this question. Standard resolution procedures apply.
              </p>
            </div>
          )}
          <div className="mt-3 border-t border-[var(--stroke)] pt-3 text-xs text-slate-500">
            <p>Resolution is determined by admin based on publicly verifiable data at the stated closing time. All decisions are final.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
