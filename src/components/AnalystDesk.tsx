"use client";

import { useEffect, useState } from "react";

type ResearchLink = { label: string; url: string };

/** Returns the URL only if it is a safe http(s) URL; prevents javascript: injection. */
function safeHref(value: string | null | undefined): string {
  const trimmed = String(value || "").trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : "#";
  } catch {
    return "#";
  }
}

const MARKET_CATEGORIES = new Set(["Crypto", "Economy", "Markets"]);

const CATEGORY_DEFAULT_SYMBOL: Record<string, string> = {
  Crypto: "BINANCE:BTCUSDT",
  Economy: "NSE:NIFTY50",
  Markets: "NSE:NIFTY50",
};

function TradingViewWidget({ symbol }: { symbol: string }) {
  const [loaded, setLoaded] = useState(false);

  const src =
    `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}` +
    `&interval=D&theme=dark&style=1&locale=en&timezone=Asia%2FKolkata` +
    `&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1` +
    `&withdateranges=1&showpopupbutton=1&studies=%5B%5D` +
    `&studies_overrides=%7B%7D&overrides=%7B%7D` +
    `&enabled_features=%5B%5D&disabled_features=%5B%5D`;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height: 400 }}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b1528]">
          <p className="text-xs text-slate-500">Loading chart for {symbol}…</p>
        </div>
      )}
      <iframe
        key={symbol}
        src={src}
        width="100%"
        height="400"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        style={{ display: "block", border: 0 }}
      />
    </div>
  );
}

type Props = {
  category: string;
  mode?: "create" | "view";
  savedChartSymbol?: string;
  savedResearchLinks?: ResearchLink[];
};

export default function AnalystDesk({ category, mode = "create", savedChartSymbol, savedResearchLinks }: Props) {
  const [open, setOpen] = useState(false);
  const isMarket = MARKET_CATEGORIES.has(category);

  const defaultSymbol = CATEGORY_DEFAULT_SYMBOL[category] || "NSE:NIFTY50";
  const [loadedSymbol, setLoadedSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);

  useEffect(() => {
    const sym = CATEGORY_DEFAULT_SYMBOL[category] || "NSE:NIFTY50";
    setLoadedSymbol(sym);
    setInputSymbol(sym);
  }, [category]);
  const hasSavedContent = savedChartSymbol || (savedResearchLinks && savedResearchLinks.length > 0);

  return (
    <div className="rounded-xl border border-[var(--brand)]/25 bg-[#060d1a]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--brand)] hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📊</span>
          <span>Analyst Desk</span>
          {hasSavedContent && mode === "view" && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              Research added
            </span>
          )}
          {!hasSavedContent && (
            <span className="rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--brand)]">
              Research
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--stroke)]/60 px-4 pb-4 pt-3">

          {/* VIEW MODE */}
          {mode === "view" && (
            <div className="space-y-4">
              {!savedChartSymbol && (!savedResearchLinks || savedResearchLinks.length === 0) && (
                <p className="text-xs text-slate-500">No research data has been added for this question.</p>
              )}

              {savedChartSymbol && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Chart — {savedChartSymbol}</p>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(savedChartSymbol)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--brand)] hover:underline"
                    >
                      Open in TradingView ↗
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-lg">
                    <TradingViewWidget symbol={savedChartSymbol} />
                  </div>
                </div>
              )}

              {savedResearchLinks && savedResearchLinks.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Research Links</p>
                  <div className="flex flex-wrap gap-2">
                    {savedResearchLinks.map((link) => (
                      <a
                        key={link.url}
                        href={safeHref(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300 transition-colors hover:border-emerald-400/50 hover:text-emerald-200"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(savedChartSymbol || (savedResearchLinks && savedResearchLinks.length > 0)) && (
                <p className="rounded-lg border border-[var(--brand)]/15 bg-[var(--brand)]/5 px-3 py-2 text-[10px] text-slate-400">
                  Cross-reference multiple sources before placing a prediction. Resolution is based on publicly verified data at the time of question resolution.
                </p>
              )}
            </div>
          )}

          {/* CREATE MODE — chart preview for market-category questions */}
          {mode === "create" && isMarket && (
            <div>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") setLoadedSymbol(inputSymbol.trim() || loadedSymbol); }}
                  placeholder="e.g. NSE:NIFTY50, BINANCE:BTCUSDT, NASDAQ:AAPL"
                  className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setLoadedSymbol(inputSymbol.trim() || loadedSymbol)}
                  className="rounded-lg bg-[var(--brand)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/30"
                >
                  Load
                </button>
              </div>
              <div className="overflow-hidden rounded-lg">
                <TradingViewWidget symbol={loadedSymbol} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
