import type { FeedQuestion, LogoAsset } from "./api";

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

export type LogoLibraryLookup = Record<string, QuestionLogo>;

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


export function buildLogoLibraryLookup(assets: LogoAsset[]): LogoLibraryLookup {
  const lookup: LogoLibraryLookup = {};
  for (const asset of assets) {
    const key = String(asset.logo_key || "").trim();
    const url = String(asset.image_url || "").trim();
    if (!key || !url) continue;
    lookup[key] = {
      url,
      label: asset.display_name || asset.logo_key,
    };
  }
  return lookup;
}

export function getQuestionLogos(question: FeedQuestion, logoLibrary?: LogoLibraryLookup): QuestionLogo[] {
  const questionLogoKeys = Array.isArray(question.logo_keys)
    ? question.logo_keys.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (questionLogoKeys.length && logoLibrary) {
    const seen = new Set<string>();
    const resolved = questionLogoKeys
      .map((logoKey) => logoLibrary[logoKey])
      .filter((item): item is QuestionLogo => Boolean(item?.url))
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });

    if (resolved.length) return resolved;
  }
  return [];
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