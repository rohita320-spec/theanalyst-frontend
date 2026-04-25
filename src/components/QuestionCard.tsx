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
  return `${Number(value || 0).toFixed(1)}%`;
}

function buildLogoFallbackUrl(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    // If Clearbit fails, fallback to Google's favicon service for same domain.
    if (parsed.hostname === "logo.clearbit.com") {
      const domain = parsed.pathname.replace(/^\/+/, "").trim();
      if (!domain) return null;
      return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(`https://${domain}`)}`;
    }
  } catch {
    return null;
  }

  return null;
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
  const sideLabels = getQuestionSideLabels(question);
  const logos = getQuestionLogos(question).slice(0, 2);
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

    // For regular markets show YES / NO.
    // For VS/sports labels show YES: TEAM_A and NO: TEAM_B.
    if (!normalizedLabel || normalizedLabel === normalizedSide) {
      return normalizedSide;
    }
    return `${normalizedSide}: ${sideLabel}`;
  }

  return (
    <article
      className="cursor-pointer rounded-xl border border-[var(--stroke)]/70 bg-[var(--surface-2)] p-3 transition-colors hover:border-slate-500/60"
      onClick={() => onOpenChart(question)}
    >
      {/* Header: logo + title + status */}
      <div className="mb-2.5 flex items-start gap-2.5">
        {/* Logo zone — prominent */}
        <div className="flex shrink-0 gap-1">
          {logos.length > 0 ? (
            logos.map((logo, idx) => (
              <img
                key={`${question._id}-logo-${idx}`}
                src={logo.url}
                alt={logo.label || question.category}
                className="h-10 w-10 rounded-lg border border-white/10 bg-slate-800 object-cover"
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

                  // Last resort: hide broken image so card UI remains clean.
                  img.style.display = "none";
                }}
              />
            ))
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--stroke)]/60 bg-[var(--surface)] text-[11px] font-semibold text-slate-500">
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
          <span className="text-[11px] text-slate-500">Pool: {formatNumber(totalPool)}</span>
          <span className="text-[var(--no)]">{formatPct(safeNo)} {sideLabels.noLabel}</span>
        </div>
      </div>

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
