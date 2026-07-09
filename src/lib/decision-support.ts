import { getConfigSignal } from "@/lib/indicators";
import {
  getClassificationSummaries,
  getThreePartRiskComment,
} from "@/lib/classification";
import type {
  ChangeItem,
  IndicatorId,
  IndicatorValue,
  OverallSignal,
  Signal,
  SimilarPeriod,
  SimilarPeriodCondition,
} from "@/types/indicator";
import { getIndicatorGlossary } from "@/lib/indicator-glossary";

const meaningfulChanges: Partial<Record<IndicatorId, number>> = {
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
  "discount-window": 2,
  btfp: 1,
  "bank-cet1": 0.3,
  "fdic-dif": 2,
  "household-debt-gdp": 1,
  "household-dsr": 0.2,
  sloos: 5,
  "office-cmbs": 0.3,
  "private-credit-default": 0.2,
  "pik-ratio": 0.5,
  "shiller-cape": 0.5,
  "buffett-indicator": 5,
  "margin-debt-gdp": 0.1,
  "margin-debt-m2": 0.1,
  icsa: 10,
};

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

export function formatIndicatorValue(
  indicator: IndicatorValue,
  value: number | string | null,
): string {
  if (typeof value === "number") {
    return `${value.toLocaleString("ja-JP", {
      minimumFractionDigits: indicator.decimals,
      maximumFractionDigits: indicator.decimals,
    })}${indicator.unit}`;
  }
  return value ?? "取得不可";
}

export function getChangeItems(indicators: IndicatorValue[]): ChangeItem[] {
  return indicators
    .flatMap((indicator) => {
      const hasNumericPair =
        indicator.numericValue !== null &&
        indicator.previousNumericValue !== null;
      const signalChanged =
        indicator.previousSignal !== "unavailable" &&
        indicator.signal !== "unavailable" &&
        indicator.previousSignal !== indicator.signal;
      const numericChange = hasNumericPair
        ? indicator.numericValue! - indicator.previousNumericValue!
        : 0;
      const worseningChange =
        indicator.thresholdDirection === "lower-is-worse"
          ? numericChange < 0
          : numericChange > 0;
      const threshold = meaningfulChanges[indicator.id] ?? Number.POSITIVE_INFINITY;
      const meaningful = Math.abs(numericChange) >= threshold;

      if (!signalChanged && !meaningful) return [];

      const direction =
        signalRank[indicator.signal] > signalRank[indicator.previousSignal] ||
        (!signalChanged && worseningChange)
          ? "worsening"
          : signalRank[indicator.signal] < signalRank[indicator.previousSignal] ||
              (!signalChanged && numericChange !== 0 && !worseningChange)
            ? "improving"
            : "flat";
      const score =
        (signalChanged ? 100 : 0) +
        (Number.isFinite(threshold) ? Math.abs(numericChange) / threshold : 0);

      return [
        {
          item: {
            id: indicator.id,
            name: indicator.name,
            previousLabel: formatIndicatorValue(
              indicator,
              indicator.previousValue,
            ),
            currentLabel: formatIndicatorValue(indicator, indicator.value),
            changeLabel: signalChanged
              ? `${signalLabel(indicator.previousSignal)} → ${signalLabel(indicator.signal)}`
              : `${numericChange >= 0 ? "+" : ""}${numericChange.toFixed(indicator.decimals)}${indicator.unit}・信号維持`,
            previousSignal: indicator.previousSignal,
            currentSignal: indicator.signal,
            direction,
          } satisfies ChangeItem,
          score,
        },
      ];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);
}

export function signalLabel(signal: Signal): string {
  return {
    green: "緑",
    yellow: "黄",
    orange: "橙",
    red: "赤",
    unavailable: "取得不可",
  }[signal];
}

function byId(indicators: IndicatorValue[], id: IndicatorId) {
  return indicators.find((item) => item.id === id);
}

export function getChangeComment(
  indicators: IndicatorValue[],
  overall: OverallSignal,
): string {
  if (overall === "unavailable") {
    return "主要信用指標を取得できないため、今日の変化と安全弁の状態を確定できません。";
  }
  return getThreePartRiskComment(indicators);
}

export function getMarketSummary(
  indicators: IndicatorValue[],
  overall: OverallSignal,
): string[] {
  if (overall === "unavailable") {
    return [
      "安全弁：主要信用指標のデータ更新を待っています。",
      "警告サイン：取得済みセンサーのみで暫定監視しています。",
      "脆弱性：安全弁と分離して損失増幅要因を確認してください。",
    ];
  }

  return getClassificationSummaries(indicators).map(
    (item) => `${item.title}：${item.status}。${item.comment}。`,
  );
}

export function getIndicatorReasons(
  indicator: IndicatorValue,
  indicators: IndicatorValue[],
): string[] {
  if (indicator.signal === "unavailable") {
    return ["最新データを取得できないため、変化理由を判定できません。"];
  }

  const reasons: string[] = [];
  const glossary = getIndicatorGlossary(indicator.id);
  const changed = indicator.previousSignal !== indicator.signal;
  if (changed) {
    reasons.push(
      `${signalLabel(indicator.previousSignal)}から${signalLabel(indicator.signal)}へ判定が変化しました。`,
    );
  } else if (
    indicator.numericValue !== null &&
    indicator.previousNumericValue !== null
  ) {
    if (indicator.numericValue > indicator.previousNumericValue) {
      reasons.push(`${glossary.measuredValue}が前回より上昇しました。`);
    } else if (indicator.numericValue < indicator.previousNumericValue) {
      reasons.push(`${glossary.measuredValue}が前回より低下しました。`);
    } else {
      reasons.push("前回から数値と信号に大きな変化はありません。");
    }
  }

  if (indicator.id === "hy-oas" && indicator.signal === "green") {
    reasons.push("HY OASは400bp未満で、信用市場の注意線には達していません。");
  }
  if (indicator.id === "vix" && indicator.signal !== "green") {
    reasons.push("VIXが20以上となり、株式市場の不安度が高まっています。");
  }
  if (indicator.id === "dgs10" && indicator.signal !== "green") {
    reasons.push("長期金利が4.5%以上で、幅広い市場の重しになっています。");
  }
  if (indicator.id === "sofr" && indicator.signal === "red") {
    reasons.push("短期金融市場の流動性に注意が必要です。");
  }
  if (
    indicator.id === "office-cmbs" &&
    indicator.signal === "red" &&
    byId(indicators, "hy-oas")?.signal === "green"
  ) {
    reasons.push("商業不動産の火は、信用市場全体にはまだ延焼していません。");
  }
  if (
    (indicator.id === "shiller-cape" ||
      indicator.id === "buffett-indicator") &&
    indicator.signal !== "green"
  ) {
    reasons.push("これは割高感の指標であり、暴落の時期を示すものではありません。");
  }
  if (indicator.id === "margin-debt-gdp" && indicator.signal !== "green") {
    reasons.push("信用取引の借入が大きく、下落時の強制売却リスクを増幅しやすい状態です。");
  }
  if (indicator.id === "margin-debt-m2" && indicator.signal !== "green") {
    reasons.push("M2に対する信用買い残高が高く、株式市場の借入燃料が大きい状態です。");
  }

  return reasons.slice(0, 2);
}

function matchesCondition(
  signal: Signal,
  condition: SimilarPeriodCondition,
): boolean {
  if (condition === "green") return signal === "green";
  if (condition === "red") return signal === "red";
  if (condition === "yellow_or_red")
    return signal === "yellow" || signal === "orange" || signal === "red";
  return signal === "green" || signal === "yellow" || signal === "orange";
}

export function findSimilarPeriod(
  indicators: IndicatorValue[],
  periods: SimilarPeriod[],
): { period: SimilarPeriod; reasons: string[] } | null {
  const indicatorMap = {
    vix: byId(indicators, "vix"),
    dgs10: byId(indicators, "dgs10"),
    hyOas: byId(indicators, "hy-oas"),
    igOas: byId(indicators, "ig-oas"),
    sofr: byId(indicators, "sofr"),
  };

  const ranked = periods
    .map((period) => {
      const entries = Object.entries(period.conditions) as [
        keyof typeof indicatorMap,
        SimilarPeriodCondition,
      ][];
      const matched = entries.filter(([key, condition]) => {
        const indicator = indicatorMap[key];
        return (
          indicator &&
          indicator.signal !== "unavailable" &&
          matchesCondition(indicator.signal, condition)
        );
      });
      return {
        period,
        score: entries.length === 0 ? 0 : matched.length / entries.length,
        reasons: matched.map(([key]) => indicatorMap[key]!.name),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score >= 0.66
    ? { period: ranked[0].period, reasons: ranked[0].reasons }
    : null;
}

export function getScenarios(indicators: IndicatorValue[]) {
  const summaries = getClassificationSummaries(indicators);
  const safety = summaries.find((item) => item.type === "safety_valve")!;
  const warning = summaries.find((item) => item.type === "warning_signal")!;
  const vulnerability = summaries.find(
    (item) => item.type === "vulnerability",
  )!;
  const base = `${safety.title}は${safety.status}、${warning.title}は${warning.status}、${vulnerability.title}は${vulnerability.status}。`;

  return [
    { label: "ベース", text: base },
    {
      label: "悪化条件",
      text: "HY OASが400bp超、VIXが30超、またはSOFRの急騰が継続。",
    },
    {
      label: "改善条件",
      text: "VIXが20未満、米10年債が4.5%未満、信用スプレッドが縮小。",
    },
  ];
}

export function getPreviousSignal(indicator: IndicatorValue): Signal {
  if (
    indicator.previousNumericValue !== null &&
    indicator.threshold
  ) {
    return getConfigSignal(indicator, indicator.previousNumericValue);
  }
  return indicator.previousSignal;
}
