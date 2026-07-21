import type {
  AutomationSettings,
  CandidateCategory,
  MarketSnapshot,
  ScoreBreakdown,
} from "@/types/x-automation";

const CATEGORY_BONUS: Record<CandidateCategory, number> = {
  market_anomaly: 20,
  investor_signal: 15,
  economic_news: 10,
  trend: 0,
};

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateZScore(values: number[]): number | null {
  if (values.length < 5) return null;
  const [latest, ...baseline] = values;
  const mean = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
  const variance = baseline.reduce((sum, value) => sum + (value - mean) ** 2, 0) / baseline.length;
  const deviation = Math.sqrt(variance);
  return deviation === 0 ? null : (latest - mean) / deviation;
}

export function calculateMarketAnomalyScore(
  market: MarketSnapshot,
  kind: string,
  settings: AutomationSettings,
) {
  const absoluteDaily = Math.abs(market.changePercent);
  const absoluteShort = Math.abs(market.shortChangePercent ?? 0);
  const absoluteZ = Math.abs(market.zScore20 ?? 0);
  let threshold = settings.thresholds.equityDailyPercent;
  if (kind === "vix") threshold = settings.thresholds.vixDailyPercent;
  if (kind === "commodity") threshold = settings.thresholds.commodityDailyPercent;
  if (kind === "crypto") threshold = settings.thresholds.cryptoDailyPercent;
  if (kind === "fx") threshold = 1;

  const usdJpyMove = market.id === "usd-jpy"
    ? Math.abs(market.value - market.previousClose) / settings.thresholds.usdJpyAbsolute
    : null;
  const daily = clamp(((usdJpyMove ?? absoluteDaily / threshold)) * 55, 0, 55);
  const short = clamp(
    (absoluteShort / settings.thresholds.equityShortPercent) * 20,
    0,
    20,
  );
  const statistical = clamp(
    (absoluteZ / settings.thresholds.zScore) * 25,
    0,
    25,
  );
  return Math.round(daily + short + statistical);
}

export function calculateInvestorSignalScore(input: {
  positionChangePercent: number;
  isNewOrExited: boolean;
  freshnessDays: number;
  japanRelevant: boolean;
  marketMoved: boolean;
  sourceIsPrimary: boolean;
}) {
  return Math.round(clamp(
    Math.min(Math.abs(input.positionChangePercent), 40) * 1.1 +
      (input.isNewOrExited ? 18 : 0) +
      Math.max(0, 15 - input.freshnessDays) +
      (input.japanRelevant ? 8 : 0) +
      (input.marketMoved ? 10 : 0) +
      (input.sourceIsPrimary ? 10 : 0),
  ));
}

export function calculateViralScore(input: {
  category: CandidateCategory;
  importance: number;
  freshness: number;
  topicVelocity: number;
  japanRelevance: number;
  spillover: number;
  surprise: number;
  forwardInterest: number;
  penalties?: number;
}): ScoreBreakdown {
  const breakdown = {
    importance: clamp(input.importance, 0, 25),
    freshness: clamp(input.freshness, 0, 15),
    topicVelocity: clamp(input.topicVelocity, 0, 15),
    japanRelevance: clamp(input.japanRelevance, 0, 15),
    spillover: clamp(input.spillover, 0, 10),
    surprise: clamp(input.surprise, 0, 10),
    forwardInterest: clamp(input.forwardInterest, 0, 10),
    categoryBonus: CATEGORY_BONUS[input.category],
    penalties: Math.max(0, input.penalties ?? 0),
    total: 0,
  };
  breakdown.total = Math.round(clamp(
    breakdown.importance +
      breakdown.freshness +
      breakdown.topicVelocity +
      breakdown.japanRelevance +
      breakdown.spillover +
      breakdown.surprise +
      breakdown.forwardInterest +
      breakdown.categoryBonus -
      breakdown.penalties,
  ));
  return breakdown;
}
