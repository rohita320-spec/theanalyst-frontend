"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchActiveLogoAssets, type FeedQuestion } from "../lib/api";
import { buildLogoLibraryLookup, getQuestionLogos, getQuestionSideLabels, type LogoLibraryLookup } from "../lib/marketPreview";

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
  return `${Number(value || 0).toFixed(1)}%`;
}

function buildLogoFallbackUrl(url: string): string | null {
  void url;
  return null;
}

let cachedLogoLibraryLookup: LogoLibraryLookup | null = null;
let cachedLogoLibraryPromise: Promise<LogoLibraryLookup> | null = null;
let cachedLogoLibraryAtMs = 0;
const LOGO_LIBRARY_CACHE_TTL_MS = 60_000;

function loadLogoLibraryLookup(forceRefresh: boolean = false): Promise<LogoLibraryLookup> {
  const isFresh = cachedLogoLibraryAtMs > 0 && Date.now() - cachedLogoLibraryAtMs < LOGO_LIBRARY_CACHE_TTL_MS;
  if (!forceRefresh && cachedLogoLibraryLookup && isFresh) {
    return Promise.resolve(cachedLogoLibraryLookup);
  }
  if (!cachedLogoLibraryPromise || forceRefresh) {
    cachedLogoLibraryPromise = fetchActiveLogoAssets()
      .then((assets) => {
        cachedLogoLibraryLookup = buildLogoLibraryLookup(assets);
        cachedLogoLibraryAtMs = Date.now();
        return cachedLogoLibraryLookup;
      })
      .catch(() => {
        cachedLogoLibraryLookup = cachedLogoLibraryLookup || {};
        if (!cachedLogoLibraryAtMs) {
          cachedLogoLibraryAtMs = Date.now();
        }
        return cachedLogoLibraryLookup;
      })
      .finally(() => {
        cachedLogoLibraryPromise = null;
      });
  }
  return cachedLogoLibraryPromise;
}

export default function QuestionCard({ question, onOpenChart, onAnalyze, placing = "", loggedIn = false }: Props) {
  const [logoLibraryLookup, setLogoLibraryLookup] = useState<LogoLibraryLookup | null>(() => {
    // Only reuse the module-level cache if it's genuinely fresh to avoid "logo flash then disappear" on stale cache.
    const isFresh = cachedLogoLibraryAtMs > 0 && Date.now() - cachedLogoLibraryAtMs < LOGO_LIBRARY_CACHE_TTL_MS;
    return isFresh ? cachedLogoLibraryLookup : null;
  });
  const questionLogoKeys = useMemo(
    () => (Array.isArray(question.logo_keys) ? question.logo_keys.map((item) => String(item || "").trim()).filter(Boolean) : []),
    [question.logo_keys],
  );
  const hasMissingLogoKey = useMemo(
    () => Boolean(questionLogoKeys.length && logoLibraryLookup && questionLogoKeys.some((logoKey) => !logoLibraryLookup[logoKey])),
    [questionLogoKeys, logoLibraryLookup],
  );

  useEffect(() => {
    let cancelled = false;
    loadLogoLibraryLookup(hasMissingLogoKey).then((lookup) => {
      if (!cancelled) {
        setLogoLibraryLookup(lookup);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasMissingLogoKey]);

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
  const sideLabels = getQuestionSideLabels(question);
  const isVsQuestion = sideLabels.yesLabel !== "YES";
  const logos = getQuestionLogos(question, logoLibraryLookup || undefined).slice(0, 2);
  const totalPool = Number(question.yes_pool || 0) + Number(question.no_pool || 0);

  function statusBadge() {
    if (isResolved) return { label: "Resolved", cls: "status-resolved" };
    if (!isOpen) return { label: "Closed", cls: "status-closed" };
    return { label: "Open", cls: "status-open" };
  }

  const badge = statusBadge();

  function getButtonLabel(side: "yes" | "no") {
    if (isResolved) return "Resolved";
    if (!isOpen) return "Closed";
    if (side === "yes" && isPlacingYes) return "Submitting…";
    if (side === "no" && isPlacingNo) return "Submitting…";
    const sideLabel = side === "yes" ? sideLabels.yesLabel : sideLabels.noLabel;
    const normalizedSide = side === "yes" ? "YES" : "NO";
    const normalizedLabel = String(sideLabel || "").trim().toUpperCase();
    if (!normalizedLabel || normalizedLabel === normalizedSide) return normalizedSide;
    // VS questions: show just the team name on the button
    if (isVsQuestion) return sideLabel;
    return `${normalizedSide}: ${sideLabel}`;
  }

  return (
    <article
      className="cursor-pointer rounded-xl border border-[var(--stroke)]/70 bg-[var(--surface-2)] p-3 transition-colors hover:border-slate-500/60"
      onClick={() => onOpenChart(question)}
    >
      {/* Header: logo + title + status */}
      <div className="mb-2.5 flex items-start gap-2.5">
        {/* Logo zone — VS layout for head-to-head questions, single logo otherwise */}
        <div className="flex shrink-0 items-center gap-1">
          {isVsQuestion && logos.length === 2 ? (
            <>
              <img
                key={`${question._id}-logo-0`}
                src={logos[0].url}
                alt={logos[0].label || sideLabels.yesLabel}
                className="h-10 w-10 rounded-lg bg-white object-contain p-0.5"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="text-[9px] font-bold text-slate-500 leading-none">vs</span>
              <img
                key={`${question._id}-logo-1`}
                src={logos[1].url}
                alt={logos[1].label || sideLabels.noLabel}
                className="h-10 w-10 rounded-lg bg-white object-contain p-0.5"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </>
          ) : logos.length > 0 ? (
            logos.map((logo, idx) => (
              <img
                key={`${question._id}-logo-${idx}`}
                src={logo.url}
                alt={logo.label || question.category}
                className="h-10 w-10 rounded-lg bg-white object-contain p-0.5"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  const img = event.currentTarget;
                  const attempts = Number(img.dataset.fallbackAttempt || "0");
                  if (attempts < 1) {
                    const fallbackUrl = buildLogoFallbackUrl(logo.url);
                    if (fallbackUrl) {
                      img.dataset.fallbackAttempt = "1";
                      img.src = fallbackUrl;
                      return;
                    }
                  }
                  img.style.display = "none";
                }}
              />
            ))
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-slate-700">
              {question.category.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold leading-snug text-white line-clamp-2">{question.title}</h2>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{question.category}</span>
            <span className="opacity-40">·</span>
            <span>{question.closes_label || "Closes soon"}</span>
          </div>
        </div>
      </div>

      {/* Pool bar — flat, no inner box */}
      <div className="mb-2.5">
        <div className="flex h-1.5 overflow-hidden rounded-full">
          <div className="h-full bg-[var(--yes)] transition-all" style={{ width: `${yesWidth}%` }} />
          <div className="h-full bg-[var(--no)] transition-all" style={{ width: `${100 - yesWidth}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs font-medium">
          <span className="text-[var(--yes)]">{sideLabels.yesLabel} {formatPct(safeYes)}</span>
          <span className="text-[11px] text-slate-500">Volume: {formatNumber(totalPool)}</span>
          <span className="text-[var(--no)]">{formatPct(safeNo)} {sideLabels.noLabel}</span>
        </div>
      </div>

      {/* Analysis type counters */}
      {question.analysis_counts && Object.keys(question.analysis_counts).length > 0 && (() => {
        const entries = Object.entries(question.analysis_counts as Record<string, number>)
          .filter(([, n]) => n > 0)
          .sort(([, a], [, b]) => b - a);
        if (!entries.length) return null;
        return (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {entries.map(([type, count]) => (
              <span key={type} className="rounded-full border border-[var(--stroke)] px-2 py-0.5 text-[10px] text-slate-400">
                {type} <span className="text-slate-500">{count}</span>
              </span>
            ))}
          </div>
        );
      })()}

      {/* Action buttons */}
      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
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
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
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
        <p className="mt-1.5 text-center text-[11px] text-slate-500">Login to participate</p>
      )}
    </article>
  );
}
