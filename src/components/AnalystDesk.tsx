"use client";

import { useEffect, useRef, useState } from "react";

type ResearchLink = { label: string; url: string };

const MARKET_CATEGORIES = new Set(["Crypto", "Economy", "Markets"]);

const RESEARCH_LINKS: Record<string, ResearchLink[]> = {
  Crypto: [
    { label: "CoinGecko", url: "https://www.coingecko.com" },
    { label: "CoinMarketCap", url: "https://coinmarketcap.com" },
    { label: "Binance Markets", url: "https://www.binance.com/en/markets/overview" },
    { label: "CryptoCompare", url: "https://www.cryptocompare.com" },
    { label: "Messari", url: "https://messari.io" },
  ],
  Economy: [
    { label: "NSE India", url: "https://www.nseindia.com" },
    { label: "BSE India", url: "https://www.bseindia.com" },
    { label: "RBI Data", url: "https://www.rbi.org.in/Scripts/Statistics.aspx" },
    { label: "SEBI", url: "https://www.sebi.gov.in" },
    { label: "Ministry of Finance", url: "https://www.finmin.nic.in" },
    { label: "MoSPI (Govt. Stats)", url: "https://mospi.gov.in" },
    { label: "World Bank Data", url: "https://data.worldbank.org" },
  ],
  Markets: [
    { label: "NSE India", url: "https://www.nseindia.com" },
    { label: "BSE India", url: "https://www.bseindia.com" },
    { label: "Moneycontrol", url: "https://www.moneycontrol.com" },
    { label: "Yahoo Finance", url: "https://finance.yahoo.com" },
    { label: "Screener.in", url: "https://www.screener.in" },
    { label: "Trendlyne", url: "https://trendlyne.com" },
  ],
  Sports: [
    { label: "ESPN Cricinfo", url: "https://www.espncricinfo.com" },
    { label: "CricBuzz", url: "https://www.cricbuzz.com" },
    { label: "BCCI", url: "https://www.bcci.tv" },
    { label: "ICC", url: "https://www.icc-cricket.com" },
    { label: "FIFA", url: "https://www.fifa.com" },
    { label: "ISL Football", url: "https://www.indiansuperleague.com" },
    { label: "ESPN", url: "https://www.espn.com" },
  ],
  "Global events": [
    { label: "Reuters", url: "https://www.reuters.com" },
    { label: "BBC News", url: "https://www.bbc.com/news" },
    { label: "The Hindu", url: "https://www.thehindu.com" },
    { label: "Economic Times", url: "https://economictimes.indiatimes.com" },
    { label: "NDTV", url: "https://www.ndtv.com" },
    { label: "UN News", url: "https://news.un.org" },
  ],
  Entertainment: [
    { label: "IMDb", url: "https://www.imdb.com" },
    { label: "Box Office India", url: "https://www.boxofficeindia.com" },
    { label: "Bollywood Hungama", url: "https://www.bollywoodhungama.com" },
    { label: "Pinkvilla", url: "https://www.pinkvilla.com" },
    { label: "Koimoi", url: "https://www.koimoi.com" },
  ],
  General: [
    { label: "Google Trends", url: "https://trends.google.com" },
    { label: "Wikipedia", url: "https://www.wikipedia.org" },
    { label: "Reuters", url: "https://www.reuters.com" },
    { label: "The Hindu", url: "https://www.thehindu.com" },
    { label: "World Bank Data", url: "https://data.worldbank.org" },
  ],
};

const CATEGORY_DEFAULT_SYMBOL: Record<string, string> = {
  Crypto: "BINANCE:BTCUSDT",
  Economy: "NSE:NIFTY50",
  Markets: "NSE:NIFTY50",
};

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.appendChild(
      document.createTextNode(
        JSON.stringify({
          width: "100%",
          height: 400,
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
        }),
      ),
    );
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={containerRef} className="tradingview-widget-container" style={{ height: 400 }} />;
}

type Props = {
  category: string;
  // create mode: admin/creator research tool while writing the question
  // view mode: user sees saved chart + links in TrendModal
  mode?: "create" | "view";
  // passed in view mode from question.metadata
  savedChartSymbol?: string;
  savedReferenceLinks?: ResearchLink[];
};

export default function AnalystDesk({ category, mode = "create", savedChartSymbol, savedReferenceLinks }: Props) {
  const [open, setOpen] = useState(false);
  const isMarket = MARKET_CATEGORIES.has(category);

  // Create mode state (chart tab only for market categories)
  const defaultSymbol = CATEGORY_DEFAULT_SYMBOL[category] || "NSE:NIFTY50";
  const [activeTab, setActiveTab] = useState<"chart" | "links">(isMarket ? "chart" : "links");
  const [loadedSymbol, setLoadedSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);

  useEffect(() => {
    const sym = CATEGORY_DEFAULT_SYMBOL[category] || "NSE:NIFTY50";
    setLoadedSymbol(sym);
    setInputSymbol(sym);
    setActiveTab(MARKET_CATEGORIES.has(category) ? "chart" : "links");
  }, [category]);

  const generalLinks = RESEARCH_LINKS[category] || RESEARCH_LINKS["General"];
  const hasSavedContent = savedChartSymbol || (savedReferenceLinks && savedReferenceLinks.length > 0);

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
              References added
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

          {/* VIEW MODE: show admin-saved chart + links, then general links */}
          {mode === "view" && (
            <div className="space-y-4">
              {savedChartSymbol && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Reference Chart</p>
                  <div className="overflow-hidden rounded-lg">
                    <TradingViewWidget symbol={savedChartSymbol} />
                  </div>
                </div>
              )}

              {savedReferenceLinks && savedReferenceLinks.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Question References</p>
                  <div className="flex flex-wrap gap-2">
                    {savedReferenceLinks.map((link) => (
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

              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">General Sources — {category}</p>
                <div className="flex flex-wrap gap-2">
                  {generalLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
                <p className="mt-3 rounded-lg border border-[var(--brand)]/15 bg-[var(--brand)]/5 px-3 py-2 text-[10px] text-slate-400">
                  Cross-reference multiple sources before placing a prediction. Resolution is based on publicly verified data at the time of question resolution.
                </p>
              </div>
            </div>
          )}

          {/* CREATE MODE: research tool for the creator */}
          {mode === "create" && (
            <>
              {/* Tab bar — chart tab only for market categories */}
              {isMarket && (
                <div className="mb-3 flex gap-1 rounded-lg border border-[var(--stroke)] bg-[#0b1528] p-1 text-xs">
                  {(["chart", "links"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-md py-1.5 capitalize transition-colors ${activeTab === tab ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-400 hover:text-white"}`}
                    >
                      {tab === "chart" ? "📈 Chart" : "🔗 Research Links"}
                    </button>
                  ))}
                </div>
              )}

              {isMarket && activeTab === "chart" && (
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
                  <p className="mb-2 text-[10px] text-slate-500">
                    Format: <span className="text-slate-300">EXCHANGE:SYMBOL</span> — e.g. NSE:RELIANCE · BINANCE:ETHUSDT · NASDAQ:TSLA. Change symbol inside the chart too.
                  </p>
                  <div className="overflow-hidden rounded-lg">
                    <TradingViewWidget symbol={loadedSymbol} />
                  </div>
                </div>
              )}

              {(!isMarket || activeTab === "links") && (
                <div>
                  <p className="mb-3 text-xs text-slate-500">
                    Verified data sources for <span className="font-medium text-slate-300">{category}</span> questions. Use these to write accurate resolution rules and set the right closing date.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generalLinks.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                  <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300/80">
                    Always cite the specific page URL in your resolution rules so participants can verify the outcome independently.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
