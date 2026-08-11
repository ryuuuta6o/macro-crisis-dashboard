import assert from "node:assert/strict";
import test from "node:test";
import { assessIndicatorFreshness, computeChangeIntelligence } from "./data-freshness";
import type { IndicatorValue } from "../types/indicator";

function indicator(overrides: Partial<IndicatorValue> = {}): IndicatorValue {
  return {
    id: "shiller-cape",
    name: "Shiller CAPE",
    shortName: "シラーPER",
    type: "vulnerability",
    category: "equity-vulnerability",
    importance: "supporting",
    unit: "",
    decimals: 1,
    description: "test",
    thresholdLabel: "test",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 25, orangeAt: 30, redAt: 35 },
    value: 42,
    previousValue: 42,
    numericValue: 42,
    previousNumericValue: 42,
    signal: "red",
    previousSignal: "red",
    observationDate: "2026-08-01",
    source: "manual",
    updateFrequency: "月次・手動確認",
    history: [
      { date: "2026-08-01", value: 42 },
      { date: "2026-07-01", value: 41.8 },
      { date: "2026-06-01", value: 41.5 },
    ],
    ...overrides,
  };
}

test("高ストレス水準が変化していない場合は更新扱いにしない", () => {
  const result = computeChangeIntelligence(indicator(), new Date("2026-08-11T00:00:00Z"));
  assert.equal(result.actionable, false);
  assert.equal(result.score, 0);
});

test("通常ノイズを超える新しい変化は更新扱いにする", () => {
  const result = computeChangeIntelligence(indicator({ value: 42.8, numericValue: 42.8 }), new Date("2026-08-11T00:00:00Z"));
  assert.equal(result.actionable, true);
  assert.ok(result.score > 0);
});

test("更新停滞データは数値が変わっていても今日の変化から除外する", () => {
  const result = computeChangeIntelligence(indicator({ observationDate: "2026-04-01", value: 43, numericValue: 43 }), new Date("2026-08-11T00:00:00Z"));
  assert.equal(result.actionable, false);
  assert.match(result.reason, /使用しません/);
});

test("月次データは公表頻度に合わせて鮮度を判定する", () => {
  const result = assessIndicatorFreshness(indicator({ observationDate: "2026-07-01" }), new Date("2026-08-11T00:00:00Z"));
  assert.equal(result.status, "aging");
});
