import type { FeedQuestion } from "./api";

const HYBRID_PRICE_UNIT = 1000;
const HYBRID_DIRECTIONAL_SHIFT = 0.2;
const HYBRID_MAX_STEP = 0.04;
const HYBRID_IMPACT_SCALE = 500;
const PROBABILITY_MIN = 0.01;
const PROBABILITY_MAX = 0.99;

export type QuestionSideLabels = {
  yesLabel: string;
  noLabel: string;
};

export type QuestionLogo = {
  url: string;
  label?: string;
};

// Direct logo URLs for crypto — CoinGecko CDN (stable). Takes priority over Clearbit.
const directLogoUrlMap: Record<string, string> = {
  bitcoin: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ethereum: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  bnb: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  xrp: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  ripple: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  cardano: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  ada: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  dogecoin: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  doge: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  avalanche: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  avax: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  polkadot: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  dot: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  chainlink: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  link: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  polygon: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
  matic: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
  toncoin: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  ton: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  shib: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  "shiba inu": "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  litecoin: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  ltc: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  tether: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  usdt: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  "usd coin": "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  usdc: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  sui: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  aptos: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  apt: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  near: "https://assets.coingecko.com/coins/images/10365/small/near_icon.png",
  cosmos: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  atom: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  stellar: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  xlm: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  uniswap: "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png",
  uni: "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png",
  aave: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
  filecoin: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  fil: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  "internet computer": "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  icp: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  hedera: "https://assets.coingecko.com/coins/images/3688/small/hbar.png",
  hbar: "https://assets.coingecko.com/coins/images/3688/small/hbar.png",
  pepe: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  arbitrum: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  arb: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  optimism: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  op: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
};

// Clearbit domain map for companies (Clearbit works well for these).
const logoDomainMap: Record<string, string> = {
  microsoft: "microsoft.com",
  google: "google.com",
  alphabet: "abc.xyz",
  apple: "apple.com",
  amazon: "amazon.com",
  aws: "aws.amazon.com",
  meta: "meta.com",
  facebook: "facebook.com",
  netflix: "netflix.com",
  tesla: "tesla.com",
  nvidia: "nvidia.com",
  amd: "amd.com",
  intel: "intel.com",
  qualcomm: "qualcomm.com",
  broadcom: "broadcom.com",
  samsung: "samsung.com",
  openai: "openai.com",
  anthropic: "anthropic.com",
  deepmind: "deepmind.com",
  mistral: "mistral.ai",
  perplexity: "perplexity.ai",
  cohere: "cohere.com",
  groq: "groq.com",
  xai: "x.ai",
  jpmorgan: "jpmorganchase.com",
  "jp morgan": "jpmorganchase.com",
  "goldman sachs": "goldmansachs.com",
  blackrock: "blackrock.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  paypal: "paypal.com",
  stripe: "stripe.com",
  coinbase: "coinbase.com",
  binance: "binance.com",
  kraken: "kraken.com",
  robinhood: "robinhood.com",
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  shopify: "shopify.com",
  adobe: "adobe.com",
  palantir: "palantir.com",
  snowflake: "snowflake.com",
  databricks: "databricks.com",
  cloudflare: "cloudflare.com",
  crowdstrike: "crowdstrike.com",
  ubereats: "uber.com",
  uber: "uber.com",
  airbnb: "airbnb.com",
  spotify: "spotify.com",
  twitter: "twitter.com",
  x: "x.com",
  tiktok: "tiktok.com",
  discord: "discord.com",
  slack: "slack.com",
  zoom: "zoom.us",
  reddit: "reddit.com",
  linkedin: "linkedin.com",
  pfizer: "pfizer.com",
  moderna: "modernatx.com",
  spacex: "spacex.com",
  boeing: "boeing.com",
  ford: "ford.com",
  walmart: "walmart.com",
  disney: "thewaltdisneycompany.com",
  nba: "nba.com",
  nfl: "nfl.com",
  fed: "federalreserve.gov",
  "federal reserve": "federalreserve.gov",
};

export type PredictionPreview = {
  avgEntryPrice: number;
  sharesReceived: number;
  projectedYesPercent: number;
  projectedNoPercent: number;
  projectedYesPool: number;
  projectedNoPool: number;
  projectedTotalPool: number;
  immediateWinPayoutEstimate: number;
  immediateWinProfitEstimate: number;
};

function clamp(value: number, lower: number, upper: number) {
  return Math.max(lower, Math.min(upper, value));
}

function toProbability(percent: number) {
  return clamp(percent / 100, PROBABILITY_MIN, PROBABILITY_MAX);
}

function probabilityToPrices(probability: number) {
  const normalized = clamp(probability, PROBABILITY_MIN, PROBABILITY_MAX);
  return {
    yesPrice: normalized * HYBRID_PRICE_UNIT,
    noPrice: (1 - normalized) * HYBRID_PRICE_UNIT,
    yesPercent: normalized * 100,
    noPercent: (1 - normalized) * 100,
  };
}

function hybridTrade(currentProbability: number, answer: "yes" | "no", points: number) {
  const influence = 1 - Math.exp(-points / HYBRID_IMPACT_SCALE);
  const targetProbability = answer === "yes"
    ? Math.min(currentProbability + HYBRID_DIRECTIONAL_SHIFT, PROBABILITY_MAX)
    : Math.max(currentProbability - HYBRID_DIRECTIONAL_SHIFT, PROBABILITY_MIN);

  let newProbability = currentProbability + (targetProbability - currentProbability) * influence;
  newProbability = clamp(
    newProbability,
    Math.max(PROBABILITY_MIN, currentProbability - HYBRID_MAX_STEP),
    Math.min(PROBABILITY_MAX, currentProbability + HYBRID_MAX_STEP),
  );

  const currentPrices = probabilityToPrices(currentProbability);
  const nextPrices = probabilityToPrices(newProbability);
  const avgEntryPrice = answer === "yes"
    ? (currentPrices.yesPrice + nextPrices.yesPrice) / 2
    : (currentPrices.noPrice + nextPrices.noPrice) / 2;

  return {
    newProbability,
    avgEntryPrice,
    yesPercent: nextPrices.yesPercent,
    noPercent: nextPrices.noPercent,
  };
}

function normalizeLabel(value: string) {
  return value.replace(/[?.!,]+$/g, "").trim();
}

function readMetadataString(question: FeedQuestion, key: string) {
  const raw = question.metadata?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function cleanLogoEntries(input: Array<string | QuestionLogo>) {
  const deduped = new Set<string>();
  const entries: QuestionLogo[] = [];

  for (const raw of input) {
    const entry = typeof raw === "string" ? { url: raw } : raw;
    const url = String(entry?.url || "").trim();
    if (!url) continue;
    if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
    if (deduped.has(url)) continue;
    deduped.add(url);
    const label = typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : undefined;
    entries.push({ url, ...(label ? { label } : {}) });
  }

  return entries;
}

function buildLogoFromEntity(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
  if (!normalized) return null;

  // First: direct URL map (crypto and special entities)
  const direct = directLogoUrlMap[normalized];
  if (direct) return direct;

  // Second: Clearbit via domain map
  const mapped = logoDomainMap[normalized];
  const domain = mapped || `${normalized.split(" ")[0]}.com`;
  return `https://logo.clearbit.com/${domain}?size=128`;
}

export function getQuestionLogos(question: FeedQuestion) {
  const sideLabels = getQuestionSideLabels(question);
  const rawLogos = question.metadata?.logos;
  if (Array.isArray(rawLogos)) {
    const direct = cleanLogoEntries(
      rawLogos.filter((item): item is string | QuestionLogo => {
        if (typeof item === "string") return true;
        if (typeof item === "object" && item !== null && "url" in item) return true;
        return false;
      }) as Array<string | QuestionLogo>,
    );
    if (direct.length) return direct;
  }

  const rawEntities = question.metadata?.entity_names;
  if (Array.isArray(rawEntities)) {
    const generated = rawEntities
      .filter((item): item is string => typeof item === "string")
      .map((name) => ({
        url: buildLogoFromEntity(name),
        label: name,
      }))
      .filter((logo): logo is { url: string; label: string } => typeof logo.url === "string");

    const cleanGenerated = cleanLogoEntries(generated);
    if (cleanGenerated.length) {
      return cleanGenerated;
    }
  }

  const inferredCandidates: string[] = [];
  if (sideLabels.yesLabel !== "YES") inferredCandidates.push(sideLabels.yesLabel);
  if (sideLabels.noLabel !== "NO") inferredCandidates.push(sideLabels.noLabel);

  if (inferredCandidates.length === 0) {
    const title = String(question.title || "");
    Object.keys(logoDomainMap).forEach((key) => {
      if (title.toLowerCase().includes(key)) {
        inferredCandidates.push(key);
      }
    });
  }

  const inferred = cleanLogoEntries(
    inferredCandidates
      .slice(0, 2)
      .map((name) => ({ url: buildLogoFromEntity(name), label: name }))
      .filter((logo): logo is { url: string; label: string } => typeof logo.url === "string"),
  );

  return inferred;
}

export function getQuestionSideLabels(question: FeedQuestion): QuestionSideLabels {
  const metadataYes = readMetadataString(question, "yes_label");
  const metadataNo = readMetadataString(question, "no_label");
  if (metadataYes && metadataNo) {
    return { yesLabel: metadataYes, noLabel: metadataNo };
  }

  if (question.category === "Sports") {
    const title = String(question.title || "").trim();
    const patterns: RegExp[] = [
      /^will\s+(.+?)\s+win\b.*?\bagainst\s+(.+)$/i,
      /^will\s+(.+?)\s+beat\s+(.+)$/i,
      /^who\s+will\s+win\b.*?\b(.+?)\s+vs\.?\s+(.+)$/i,
      /^who\s+will\s+win\b.*?\b(.+?)\s+or\s+(.+)$/i,
      /^(.+?)\s+vs\.?\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const yesLabel = normalizeLabel(match[1]);
        const noLabel = normalizeLabel(match[2]);
        if (yesLabel && noLabel) {
          return { yesLabel, noLabel };
        }
      }
    }
  }

  return { yesLabel: "YES", noLabel: "NO" };
}

export function getAnswerDisplayLabel(question: FeedQuestion, answer: "yes" | "no") {
  const labels = getQuestionSideLabels(question);
  return answer === "yes" ? labels.yesLabel : labels.noLabel;
}

export function buildPredictionPreview(
  question: FeedQuestion,
  answer: "yes" | "no",
  pointsToSpend: number,
): PredictionPreview | null {
  if (!Number.isFinite(pointsToSpend) || pointsToSpend <= 0) {
    return null;
  }

  const currentProbability = toProbability(Number(question.yes_percent ?? 50));
  const trade = hybridTrade(currentProbability, answer, pointsToSpend);
  if (trade.avgEntryPrice <= 0) {
    return null;
  }

  const sharesReceived = pointsToSpend / trade.avgEntryPrice;
  const currentYesPool = Number(question.yes_pool || 0);
  const currentNoPool = Number(question.no_pool || 0);
  const projectedYesPool = answer === "yes" ? currentYesPool + pointsToSpend : currentYesPool;
  const projectedNoPool = answer === "no" ? currentNoPool + pointsToSpend : currentNoPool;
  const projectedTotalPool = projectedYesPool + projectedNoPool;

  const currentYesShares = Number(question.total_yes_shares || 0);
  const currentNoShares = Number(question.total_no_shares || 0);
  const projectedYesShares = answer === "yes" ? currentYesShares + sharesReceived : currentYesShares;
  const projectedNoShares = answer === "no" ? currentNoShares + sharesReceived : currentNoShares;
  const winningSharesNow = answer === "yes" ? projectedYesShares : projectedNoShares;
  const pointsPerWinningShareNow = winningSharesNow > 0 ? projectedTotalPool / winningSharesNow : 0;
  const immediateWinPayoutEstimate = sharesReceived * pointsPerWinningShareNow;

  return {
    avgEntryPrice: Number(trade.avgEntryPrice.toFixed(4)),
    sharesReceived: Number(sharesReceived.toFixed(4)),
    projectedYesPercent: Number(trade.yesPercent.toFixed(2)),
    projectedNoPercent: Number(trade.noPercent.toFixed(2)),
    projectedYesPool: Number(projectedYesPool.toFixed(2)),
    projectedNoPool: Number(projectedNoPool.toFixed(2)),
    projectedTotalPool: Number(projectedTotalPool.toFixed(2)),
    immediateWinPayoutEstimate: Number(immediateWinPayoutEstimate.toFixed(2)),
    immediateWinProfitEstimate: Number((immediateWinPayoutEstimate - pointsToSpend).toFixed(2)),
  };
}