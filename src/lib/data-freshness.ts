import type { IndicatorValue, Signal } from "@/types/indicator";

export type FreshnessStatus = "fresh" | "aging" | "stale" | "unknown";

export type IndicatorFreshness = {
  status: FreshnessStatus;
  ageDays: number | null;
  expectedDays: number;
  staleAfterDays: number;
  label: string;
  note: string;
};

export type ChangeIntelligence = {
  actionable: boolean;
  score: number;
  velocityScore: number;
  percentileScore: number;
  signalChanged: boolean;
  numericChanged: boolean;
  reason: string;
};

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const meaningfulChanges: Partial<Record<IndicatorValue["id"], number>> = {
  "hy-oas": 15,
  "baa-aaa": 0.1,
  "ig-oas": 0.08,
  "ccc-oas": 30,
  vix: 2,
  dgs10: 0.08,
  dgs30: 0.08,
  move: 5,
  sofr: 0.08,
  "ted-spread": 0.05,
  "fra-ois": 5,
  "bank-deposit-outflow": 10,
  "mmf-assets": 20,
  "discount-window": 2,
  btfp: 1,
  "bank-cet1": 0.3,
  "fdic-dif": 2,
  "household-debt-gdp": 1,
  "household-dsr": 0.2,
  sloos: 5,
  "office-cmbs": 0.3,
  "cmbs-total": 0.3,
  "private-credit-default": 0.2,
  "pik-ratio": 0.5,
  "leveraged-loan-default": 0.2,
  "shiller-cape": 0.5,
  "buffett-indicator": 5,
  "margin-debt-gdp": 0.1,
  "margin-debt-m2": 0.1,
  icsa: 10,
};

export function assessIndicatorFreshness(
  indicator: IndicatorValue,
  now = new Date(),
): IndicatorFreshness {
  const cadence = cadenceDays(indicator);
  if (!indicator.observationDate) {
    return {
      status: "unknown",
      ageDays: null,
      expectedDays: cadence.expected,
      staleAfterDays: cadence.stale,
      label: "観測日不明",
      note: "観測日を確認できないため、今日の変化判定から除外します。",
    };
  }

  const observedAt = parseObservationDate(indicator.observationDate);
  if (!observedAt) {
    return {
      status: "unknown",
      ageDays: null,
      expectedDays: cadence.expected,
      staleAfterDays: cadence.stale,
      label: "日付確認中",
      note: "観測日の形式を確認できないため、今日の変化判定から除外します。",
    };
  }

  const ageDays = Math.max(0, Math.floor((now.getTime() - observedAt.getTime()) / 86_400_000));
  const status: FreshnessStatus = ageDays > cadence.stale
    ? "stale"
    : ageDays > cadence.expected
      ? "aging"
      : "fresh";

  return {
    status,
    ageDays,
    expectedDays: cadence.expected,
    staleAfterDays: cadence.stale,
    label: status === "fresh"
      ? "更新範囲内"
      : status === "aging"
        ? "次回更新待ち"
        : "更新停滞",
    note: status === "fresh"
      ? `観測から${ageDays}日。公表頻度の範囲内です。`
      : status === "aging"
        ? `観測から${ageDays}日。次回公表または確認更新を待っています。`
        : `観測から${ageDays}日。現在の変化判定には使用しません。`,
  };
}

export function computeChangeIntelligence(
  indicator: IndicatorValue,
  now = new Date(),
): ChangeIntelligence {
  const freshness = assessIndicatorFreshness(indicator, now);
  const signalChanged =
    indicator.previousSignal !== "unavailable" &&
    indicator.signal !== "unavailable" &&
    indicator.previousSignal !== indicator.signal;
  const numericChanged =
    indicator.numericValue !== null &&
    indicator.previousNumericValue !== null &&
    indicator.numericValue !== indicator.previousNumericValue;

  if (freshness.status === "stale" || freshness.status === "unknown") {
    return {
      actionable: false,
      score: 0,
      velocityScore: 0,
      percentileScore: historicalPercentile(indicator),
      signalChanged,
      numericChanged,
      reason: freshness.note,
    };
  }

  const change = numericChanged
    ? Math.abs(indicator.numericValue! - indicator.previousNumericValue!)
    : 0;
  const meaningful = meaningfulChanges[indicator.id] ?? fallbackMeaningfulChange(indicator);
  const velocityScore = meaningful > 0
    ? Math.min(100, Math.round((change / meaningful) * 55))
    : 0;
  const percentileScore = historicalPercentile(indicator);
  const signalScore = signalChanged
    ? 70 + Math.max(0, signalRank[indicator.signal]) * 10
    : Math.max(0, signalRank[indicator.signal]) * 8;
  const actionable = signalChanged || (numericChanged && change >= meaningful);
  const score = actionable
    ? Math.min(100, Math.round(velocityScore * 0.55 + percentileScore * 0.2 + signalScore * 0.25))
    : 0;

  return {
    actionable,
    score,
    velocityScore,
    percentileScore,
    signalChanged,
    numericChanged,
    reason: actionable
      ? signalChanged
        ? "信号色が変化しました。"
        : "通常ノイズを超える変化を検出しました。"
      : "高い水準でも、前回から有意な変化がないため更新扱いにしません。",
  };
}

function cadenceDays(indicator: IndicatorValue) {
  const label = (indicator.updateFrequency ?? "").toLowerCase();
  if (label.includes("日次") || label.includes("営業日") || label.includes("daily")) return { expected: 4, stale: 9 };
  if (label.includes("週次") || label.includes("weekly")) return { expected: 10, stale: 21 };
  if (label.includes("月次") || label.includes("monthly")) return { expected: 40, stale: 70 };
  if (label.includes("四半期") || label.includes("quarter")) return { expected: 115, stale: 155 };
  if (label.includes("半期")) return { expected: 210, stale: 260 };
  if (label.includes("年次") || label.includes("annual")) return { expected: 390, stale: 460 };

  if (indicator.id === "icsa" || indicator.id === "bank-deposit-outflow" || indicator.id === "mmf-assets" || indicator.id === "discount-window" || indicator.id === "btfp") {
    return { expected: 10, stale: 21 };
  }
  if (indicator.source === "manual" || indicator.source === "published") return { expected: 40, stale: 70 };
  return { expected: 4, stale: 9 };
}

function historicalPercentile(indicator: IndicatorValue) {
  if (indicator.numericValue === null || indicator.history.length < 3) return 50;
  const values = indicator.history.map((point) => point.value).filter(Number.isFinite);
  if (!values.length) return 50;
  const current = indicator.numericValue;
  const lessOrEqual = values.filter((value) => value <= current).length;
  const raw = (lessOrEqual / values.length) * 100;
  return Math.round(indicator.thresholdDirection === "lower-is-worse" ? 100 - raw : raw);
}

function fallbackMeaningfulChange(indicator: IndicatorValue) {
  if (indicator.numericValue === null) return Number.POSITIVE_INFINITY;
  return Math.max(10 ** -indicator.decimals, Math.abs(indicator.numericValue) * 0.02);
}

function parseObservationDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value);
  return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
}
