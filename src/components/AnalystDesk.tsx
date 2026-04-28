"use client";

import { useEffect, useRef, useState } from "react";

type ResearchLink = { label: string; url: string };

const MARKET_CATEGORIES = new Set(["Crypto", "Economy", "Markets"]);

const CATEGORY_DEFAULT_SYMBOL: Record<string, string> = {
  Crypto: "BINANCE:BTCUSDT",
  Economy: "NSE:NIFTY50",
  Markets: "NSE:NIFTY50",
};

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    // Detect when TradingView injects its iframe (more reliable than script onload)
    const observer = new MutationObserver(() => {
      if (container.querySelector("iframe")) {
        observer.disconnect();
        setTimeout(() => setLoading(false), 400);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Fallback: hide loading after 8s regardless
    const fallback = setTimeout(() => setLoading(false), 8000);

    // TradingView requires this target div to exist before the script runs
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 380,
      symbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
      container.innerHTML = "";
      setLoading(true);
    };
  }, [symbol]);

  return (
    <div className="relative" style={{ height: 380 }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#0b1528]">
          <p className="text-xs text-slate-500">Loading chart for {symbol}…</p>
        </div>
      )}
      <div ref={containerRef} className="tradingview-widget-container" style={{ height: 380 }} />
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
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
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
