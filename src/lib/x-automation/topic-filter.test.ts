import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/config/x-automation";
import { buildRealtimeSnapshotCandidate } from "@/lib/x-automation/candidates";
import { candidateMatchesTopic } from "@/lib/x-automation/topic-filter";
import type { AutomationInput, PostCandidate } from "@/types/x-automation";

const candidate = (overrides: Partial<PostCandidate>): PostCandidate => ({
  id: "candidate",
  themeKey: "market:sp500",
  title: "S&P 500の最新値",
  category: "market_anomaly",
  summary: "株価指数の変化",
  facts: ["前日比 +1.00%"],
  watchNext: "VIX",
  sourceIds: ["source"],
  sources: [{ id: "source", name: "Market", url: "https://example.com", kind: "market_data", publishedAt: "2026-07-21T00:00:00Z", fetchedAt: "2026-07-21T00:01:00Z" }],
  relatedIndicators: ["VIX"],
  anomalyScore: 50,
  investorScore: 0,
  viral: { importance: 15, freshness: 15, topicVelocity: 5, japanRelevance: 10, spillover: 5, surprise: 5, forwardInterest: 8, categoryBonus: 20, penalties: 0, total: 83 },
  publishedAt: "2026-07-21T00:00:00Z",
  ...overrides,
});

test("カテゴリー選択で株価と著名人を分離する", () => {
  assert.equal(candidateMatchesTopic(candidate({}), "stock_market"), true);
  assert.equal(candidateMatchesTopic(candidate({}), "influential_people"), false);
  assert.equal(candidateMatchesTopic(candidate({
    themeKey: "news:著名人:Warren Buffett",
    category: "economic_news",
  }), "influential_people"), true);
});

test("金利・信用カテゴリーは関連指標を拾う", () => {
  assert.equal(candidateMatchesTopic(candidate({
    themeKey: "indicator:hy-oas",
    title: "HY OASの変化",
    relatedIndicators: ["信用スプレッド"],
  }), "credit_rates"), true);
});

test("異常候補がない時も市場値と公式指標から概況候補を作る", () => {
  const input = {
    collectedAt: "2026-07-21T12:00:00Z",
    markets: [{
      id: "sp500", name: "S&P 500", ticker: "^GSPC", value: 7000, previousClose: 6965,
      changePercent: 0.5, shortChangePercent: 0.1, zScore20: 0.4,
      observedAt: "2026-07-21T11:55:00Z", sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/", history: [],
    }],
    indicators: [{
      id: "dgs10", name: "米10年国債利回り", numericValue: 4.4, signal: "yellow",
      source: "treasury", sourceName: "U.S. Treasury", sourceLabel: "U.S. Treasury",
      sourceUrl: "https://home.treasury.gov/", fredSeries: [], observationDate: "2026-07-21",
      value: "4.40", unit: "%",
    }],
    news: [], newsMode: "official", investorSignals: [],
  } as unknown as AutomationInput;
  const result = buildRealtimeSnapshotCandidate(input, DEFAULT_AUTOMATION_SETTINGS, "stock_market");
  assert.ok(result);
  assert.equal(new Set(result.sources.map((source) => source.name)).size, 2);
  assert.ok(result.facts.some((fact) => fact.includes("S&P 500")));
});
