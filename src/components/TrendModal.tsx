"use client";

import type { FeedQuestion, HistoryPoint } from "../lib/api";
import { getQuestionSideLabels } from "../lib/marketPreview";
import AnalystDesk from "./AnalystDesk";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  question: FeedQuestion | null;
  points: HistoryPoint[];
  loading: boolean;
  error: string | null;
  timeframe: "hourly" | "daily" | "all";
  onChangeTimeframe: (value: "hourly" | "daily" | "all") => void;
  onClose: () => void;
};

function formatDateLabel(ts: string, mode: "hourly" | "daily" | "all"): string {
  try {
    const d = new Date(ts);
    if (mode === "hourly") {
      return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatAxisTick(ts: string, mode: "hourly" | "daily" | "all") {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  if (mode === "hourly") {
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

  const sideLabels = getQuestionSideLabels(question);

  const chartData = points.map((point, idx) => ({
    idx,
    timestamp: point.timestamp,
    yes: Number(point.yes_percent || 0),
    no: Number(point.no_percent || 0),
    yesPool: Number(point.yes_pool || 0),
    noPool: Number(point.no_pool || 0),
    totalPool: Number((point.yes_pool || 0) + (point.no_pool || 0)),
  }));

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
              <p className="text-xs text-slate-400">Current {sideLabels.yesLabel}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--yes)]">{formatPct(lastPoint.yes_percent)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Current {sideLabels.noLabel}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--no)]">{formatPct(lastPoint.no_percent)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Start {sideLabels.yesLabel}</p>
              <p className="mt-1 text-lg font-semibold text-slate-300">{formatPct(firstPoint?.yes_percent || 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
              <p className="text-xs text-slate-400">Total Points</p>
              <p className="mt-1 text-lg font-semibold text-slate-300">{new Intl.NumberFormat("en-US").format(Number((lastPoint.yes_pool || 0) + (lastPoint.no_pool || 0)))} pts</p>
            </div>
          </div>
        )}

        {loading && <p className="py-8 text-center text-sm text-slate-400">Loading history...</p>}
        {error && <p className="py-4 text-center text-sm text-amber-300">{error}</p>}

        {/* Chart */}
        {!loading && points.length > 0 && (
          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3 sm:p-4">
            <p className="mb-2 text-sm font-medium text-slate-200">Sentiment trend</p>
            {/* Legend */}
            <div className="mb-3 flex items-center gap-4 px-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-[var(--yes)]" />
                {sideLabels.yesLabel} %
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-[var(--no)]" />
                {sideLabels.noLabel} %
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-[#3b82f6] opacity-50" />
                Volume
              </span>
            </div>

            <div className="h-64 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 6, right: 48, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2a3d" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    minTickGap={24}
                    tickFormatter={(value) => formatAxisTick(String(value), timeframe)}
                  />
                  <YAxis
                    yAxisId="pct"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                    width={42}
                  />
                  <YAxis
                    yAxisId="vol"
                    orientation="right"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const yes = payload.find((p) => p.dataKey === "yes");
                      const no = payload.find((p) => p.dataKey === "no");
                      const vol = payload.find((p) => p.dataKey === "totalPool");
                      const yesVal = Number(yes?.value ?? 0);
                      const noVal = Number(no?.value ?? 0);
                      const yesFirst = yesVal >= noVal;
                      return (
                        <div style={{ background: "#0b1528", border: "1px solid #2b3b55", borderRadius: 12, padding: "8px 12px", fontSize: 12 }}>
                          <p style={{ color: "#94a3b8", marginBottom: 6 }}>{formatDateLabel(String(label ?? ""), timeframe)}</p>
                          {yesFirst ? (
                            <>
                              {yes && <p style={{ color: "#34d399" }}>{sideLabels.yesLabel} : {formatPct(yesVal)}</p>}
                              {no && <p style={{ color: "#fb923c" }}>{sideLabels.noLabel} : {formatPct(noVal)}</p>}
                            </>
                          ) : (
                            <>
                              {no && <p style={{ color: "#fb923c" }}>{sideLabels.noLabel} : {formatPct(noVal)}</p>}
                              {yes && <p style={{ color: "#34d399" }}>{sideLabels.yesLabel} : {formatPct(yesVal)}</p>}
                            </>
                          )}
                          {vol && <p style={{ color: "#3b82f6" }}>Volume : {new Intl.NumberFormat("en-US").format(Number(vol.value ?? 0))} pts</p>}
                        </div>
                      );
                    }}
                  />
                  <Bar
                    yAxisId="vol"
                    dataKey="totalPool"
                    fill="#3b82f6"
                    opacity={0.25}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={24}
                  />
                  <Area
                    yAxisId="pct"
                    type="monotone"
                    dataKey="no"
                    stroke="#fb923c"
                    fillOpacity={0}
                    fill="#fb923c"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    yAxisId="pct"
                    type="monotone"
                    dataKey="yes"
                    stroke="#34d399"
                    fill="url(#yesFill)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {chartData.length > 0 && (
                    <>
                      <ReferenceDot
                        yAxisId="pct"
                        x={chartData[chartData.length - 1].timestamp}
                        y={chartData[chartData.length - 1].yes}
                        r={5}
                        fill="#34d399"
                        stroke="#072015"
                        strokeWidth={2}
                      />
                      <ReferenceDot
                        yAxisId="pct"
                        x={chartData[chartData.length - 1].timestamp}
                        y={chartData[chartData.length - 1].no}
                        r={4}
                        fill="#fb923c"
                        stroke="#2f1505"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Analyst Desk ─────────────────────────────────────── */}
        <div className="mt-4">
          <AnalystDesk
            category={question.category}
            mode="view"
            savedChartSymbol={typeof question.metadata?.chart_symbol === "string" ? question.metadata.chart_symbol : undefined}
            savedResearchLinks={Array.isArray(question.metadata?.reference_links) ? question.metadata.reference_links as { label: string; url: string }[] : undefined}
          />
        </div>

        {/* ── Analysis Breakdown ───────────────────────────────── */}
        {(() => {
          const ANALYSIS_TYPES: Record<string, string[]> = {
            crypto: ["Technical Analysis", "Fundamental Analysis", "On-Chain Analysis"],
            markets: ["Technical Analysis", "Fundamental Analysis"],
            economy: ["Macro Analysis", "Historical Trends", "Fundamental Analysis", "Policy Analysis"],
            entertainment: ["Trend Analysis", "Historical Analysis", "Public Opinion"],
            general: ["Logical Reasoning", "Historical Trends", "News/Event-Driven", "Public Opinion"],
            "global events": ["Geopolitical Analysis", "Historical Patterns"],
            sports: ["Statistical Analysis", "Form Analysis", "Historical Head-to-Head"],
          };
          const types = ANALYSIS_TYPES[question.category.toLowerCase()] ?? [];
          if (!types.length) return null;
          const counts = (question.analysis_counts as Record<string, number> | null) ?? {};
          const total = types.reduce((s, t) => s + (counts[t] ?? 0), 0);
          return (
            <div className="mt-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Analysis Sentiment</h4>
              <div className="space-y-3">
                {types.map((type) => {
                  const count = counts[type] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{type}</span>
                        <span className="text-slate-500">{count > 0 ? `${count} · ${pct}%` : "—"}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">
                {total > 0 ? `${total} analyst${total !== 1 ? "s" : ""} tagged their approach` : "No analysis tags yet — be the first"}
              </p>
            </div>
          );
        })()}

        {/* ── Resolution Rules ─────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Resolution Rules</h4>
          {question.resolution_rules ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{question.resolution_rules}</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-400">
              <p>This question will be resolved based on publicly verified data. The admin will determine the outcome according to the resolution criteria and make a final determination.</p>
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠ Specific resolution rules have not been set for this question. Standard resolution procedures apply.
              </p>
            </div>
          )}
          <div className="mt-3 border-t border-[var(--stroke)] pt-3 text-xs text-slate-500">
            <p>Resolution is determined by admin based on publicly verified data. Points distribution will be completed within 48 hours of resolution. Closing time only stops new predictions and does not determine resolution by itself.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
