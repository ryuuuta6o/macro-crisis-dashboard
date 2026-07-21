import type { GenerationTopic, PostCandidate } from "@/types/x-automation";

const STOCK_MARKETS = new Set([
  "market:nikkei", "market:topix", "market:sp500", "market:nasdaq", "market:sox",
  "market:kospi", "market:taiwan", "market:shanghai", "market:sp-future", "market:nasdaq-future",
]);

const FX_COMMODITY_CRYPTO = new Set([
  "market:usd-jpy", "market:eur-usd", "market:gold", "market:oil", "market:bitcoin",
]);

const JAPAN_ASIA_MARKETS = new Set([
  "market:nikkei", "market:topix", "market:kospi", "market:taiwan", "market:shanghai", "market:usd-jpy",
]);

const CREDIT_RATE_TERMS = [
  "hy oas", "ig oas", "ccc oas", "baa", "spread", "スプレッド", "dgs10", "dgs30",
  "金利", "国債", "sofr", "repo", "流動性", "liquidity", "credit", "信用", "銀行",
];

const JAPAN_ASIA_TERMS = [
  "japan", "日本", "日銀", "円", "asia", "アジア", "china", "中国", "韓国", "台湾",
  "nikkei", "topix", "kospi", "shanghai",
];

function searchableText(candidate: PostCandidate) {
  return [
    candidate.themeKey,
    candidate.title,
    candidate.summary,
    candidate.watchNext,
    ...candidate.relatedIndicators,
    ...candidate.facts,
  ].join(" ").toLowerCase();
}

export function candidateMatchesTopic(candidate: PostCandidate, topic: GenerationTopic) {
  if (topic === "all") return true;
  const text = searchableText(candidate);

  if (topic === "stock_market") return STOCK_MARKETS.has(candidate.themeKey);
  if (topic === "influential_people") {
    return candidate.category === "investor_signal" || candidate.themeKey.startsWith("news:著名人:");
  }
  if (topic === "credit_rates") {
    return CREDIT_RATE_TERMS.some((term) => text.includes(term));
  }
  if (topic === "economy_policy") {
    return candidate.category === "economic_news" && !candidate.themeKey.startsWith("news:著名人:");
  }
  if (topic === "fx_commodities_crypto") return FX_COMMODITY_CRYPTO.has(candidate.themeKey);
  if (topic === "japan_asia") {
    return JAPAN_ASIA_MARKETS.has(candidate.themeKey)
      || JAPAN_ASIA_TERMS.some((term) => text.includes(term));
  }
  if (topic === "social_trends") return candidate.category === "trend";
  return false;
}

export function filterCandidatesByTopic(candidates: PostCandidate[], topic: GenerationTopic) {
  return candidates.filter((candidate) => candidateMatchesTopic(candidate, topic));
}
