import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/config/x-automation";
import {
  calculateInvestorSignalScore,
  calculateMarketAnomalyScore,
  calculateViralScore,
  calculateZScore,
} from "@/lib/x-automation/scoring";

test("異常値スコアは大幅変動とz-scoreで上昇する", () => {
  const quiet = calculateMarketAnomalyScore({
    id: "sp500", name: "S&P 500", ticker: "^GSPC", value: 100, previousClose: 99.8,
    changePercent: 0.2, shortChangePercent: null, zScore20: 0.3, observedAt: "2026-07-20T00:00:00Z", sourceUrl: "https://example.com", history: [],
  }, "equity", DEFAULT_AUTOMATION_SETTINGS);
  const shock = calculateMarketAnomalyScore({
    id: "sp500", name: "S&P 500", ticker: "^GSPC", value: 96, previousClose: 100,
    changePercent: -4, shortChangePercent: -1.2, zScore20: -3.1, observedAt: "2026-07-20T00:00:00Z", sourceUrl: "https://example.com", history: [],
  }, "equity", DEFAULT_AUTOMATION_SETTINGS);
  assert.ok(shock > quiet);
  assert.ok(shock >= 90);
});

test("z-scoreを直近値と過去分布から計算する", () => {
  assert.ok((calculateZScore([10, 1, 1, 1, 2, 0]) ?? 0) > 5);
  assert.equal(calculateZScore([1, 1, 1]), null);
});

test("著名投資家シグナルは一次情報と大幅変更を加点する", () => {
  const weak = calculateInvestorSignalScore({ positionChangePercent: 2, isNewOrExited: false, freshnessDays: 30, japanRelevant: false, marketMoved: false, sourceIsPrimary: false });
  const strong = calculateInvestorSignalScore({ positionChangePercent: 50, isNewOrExited: true, freshnessDays: 1, japanRelevant: true, marketMoved: true, sourceIsPrimary: true });
  assert.ok(strong > weak);
});

test("バイラルスコアはカテゴリ補正込みで100以内", () => {
  const result = calculateViralScore({ category: "market_anomaly", importance: 25, freshness: 15, topicVelocity: 15, japanRelevance: 15, spillover: 10, surprise: 10, forwardInterest: 10 });
  assert.equal(result.categoryBonus, 20);
  assert.equal(result.total, 100);
});

