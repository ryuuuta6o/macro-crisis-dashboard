import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWhaleMovementSize,
  estimatePositionChangeValue,
} from "@/lib/whale-movements";
import type { SmartMoneyPosition } from "@/types/smart-money";

const position: SmartMoneyPosition = {
  ticker: null,
  cusip: "000000000",
  company: "TEST INC",
  securityClass: "COM",
  optionType: null,
  shareType: "SH",
  previousShares: 1_000_000,
  currentShares: 1_500_000,
  previousValue: 90_000_000,
  currentValue: 150_000_000,
  changePercent: 50,
  changeType: "買い増し",
  portfolioWeight: 2,
  source: "SEC Form 13F",
  sourceUrl: "https://www.sec.gov/",
  note: "",
};

test("13F株数差を四半期末の開示単価で推定規模へ換算する", () => {
  assert.equal(estimatePositionChangeValue(position), 50_000_000);
});

test("大口変化の規模ラベルを金額帯で分類する", () => {
  assert.equal(classifyWhaleMovementSize(49_999_999), "小型");
  assert.equal(classifyWhaleMovementSize(50_000_000), "中型");
  assert.equal(classifyWhaleMovementSize(250_000_000), "大型");
  assert.equal(classifyWhaleMovementSize(1_000_000_000), "超大型");
});
