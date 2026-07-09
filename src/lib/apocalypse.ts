import type { BehaviorSignalItem } from "@/types/behavior";
import type {
  IndicatorValue,
  MarketNewsItem,
  RiskLevel,
  Signal,
} from "@/types/indicator";
import type { SmartMoneyInvestor } from "@/types/smart-money";

const stressValue: Record<Signal, number> = {
  green: 8,
  yellow: 42,
  orange: 70,
  red: 100,
  unavailable: 50,
};

const levelValue: Record<RiskLevel, number> = {
  green: 8,
  yellow: 42,
  orange: 70,
  red: 100,
};

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function average(values: number[], fallback = 0) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;
}

function indicatorAverage(indicators: IndicatorValue[], type: IndicatorValue["type"]) {
  return average(
    indicators
      .filter((indicator) => indicator.type === type && indicator.signal !== "unavailable")
      .map((indicator) => stressValue[indicator.signal]),
  );
}

function levelForScore(score: number): RiskLevel {
  if (score >= 75) return "red";
  if (score >= 50) return "orange";
  if (score >= 25) return "yellow";
  return "green";
}

function newsRadar(news: MarketNewsItem[]) {
  const now = Date.now();
  const recent = news.filter(
    (item) => now - new Date(item.publishedAt).getTime() <= 24 * 60 * 60 * 1000,
  );
  const redCount = recent.filter((item) => item.impactLevel === "red").length;
  const averageImpact = average(recent.map((item) => item.impactScore));
  const score = Math.round(clamp(recent.length * 5 + redCount * 12 + averageImpact * 1.25));
  const categories = Object.entries(
    recent.reduce<Record<string, number>>((counts, item) => {
      counts[item.impactCategory] = (counts[item.impactCategory] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  return {
    score,
    level: levelForScore(score),
    recentCount: recent.length,
    redCount,
    categories,
    items: news.slice(0, 3),
    label:
      score >= 75 ? "ニュース密度が非常に高い" :
      score >= 50 ? "ニュースが集中" :
      score >= 25 ? "注意材料が増加" : "通常範囲",
  };
}

function getItem(indicators: IndicatorValue[], id: IndicatorValue["id"]) {
  return indicators.find((indicator) => indicator.id === id);
}

function marketEscape(indicators: IndicatorValue[], behavior: BehaviorSignalItem[]) {
  const ids: IndicatorValue["id"][] = [
    "mmf-assets",
    "bank-deposit-outflow",
    "hy-oas",
    "ig-oas",
    "vix",
  ];
  const marketSignals = ids
    .map((id) => getItem(indicators, id))
    .filter((item): item is IndicatorValue => Boolean(item) && item?.signal !== "unavailable")
    .map((item) => stressValue[item.signal]);
  const escapeBehavior = behavior.filter((item) =>
    ["escape-money", "credit-escape"].includes(item.id),
  );
  const marketScore = average(marketSignals, 25);
  const behaviorScore = average(escapeBehavior.map((item) => levelValue[item.level]), 25);
  const score = Math.round(clamp(marketScore * 0.65 + behaviorScore * 0.35));

  return {
    score,
    level: levelForScore(score),
    label:
      score >= 75 ? "急速な資金逃避" :
      score >= 50 ? "逃避フロー強まる" :
      score >= 25 ? "一部で防衛移動" : "通常フロー",
  };
}

function wealthyDefense(behavior: BehaviorSignalItem[], investors: SmartMoneyInvestor[]) {
  const available = investors.filter((investor) => investor.dataStatus === "live");
  const stanceScores = available.map((investor) =>
    investor.stance === "守り" ? 85 : investor.stance === "中立" ? 45 : 15,
  );
  const behaviorScores = behavior
    .filter((item) => ["smart-money", "insider-selling", "escape-money"].includes(item.id))
    .map((item) => levelValue[item.level]);
  const score = Math.round(
    clamp(average(stanceScores, 45) * 0.6 + average(behaviorScores, 35) * 0.4),
  );

  return {
    score,
    level: levelForScore(score),
    label:
      score >= 75 ? "防衛強化" : score >= 50 ? "守り寄り" : score >= 25 ? "中立" : "攻め寄り",
    availableCount: available.length,
    investors: available.slice(0, 3),
  };
}

function anomalies(indicators: IndicatorValue[]) {
  return indicators
    .filter((indicator) => indicator.signal !== "unavailable")
    .map((indicator) => {
      const signalDelta = signalRank[indicator.signal] - signalRank[indicator.previousSignal];
      const numericChange =
        indicator.numericValue !== null && indicator.previousNumericValue !== null
          ? Math.abs(indicator.numericValue - indicator.previousNumericValue) /
            Math.max(Math.abs(indicator.previousNumericValue), 0.01)
          : 0;
      const score = stressValue[indicator.signal] + Math.max(0, signalDelta) * 30 + Math.min(30, numericChange * 100);
      return {
        id: indicator.id,
        name: indicator.shortName,
        signal: indicator.signal as Exclude<Signal, "unavailable">,
        value: indicator.value,
        unit: indicator.unit,
        score,
        reason:
          signalDelta > 0
            ? `${indicator.previousSignal.toUpperCase()}から${indicator.signal.toUpperCase()}へ悪化`
            : indicator.signal === "red" || indicator.signal === "orange"
              ? "高ストレス水準が継続"
              : numericChange >= 0.05
                ? "前回値からの変化幅が拡大"
                : "注意水準を継続監視",
      };
    })
    .filter((item) => item.signal !== "green" || item.score >= 35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function crisisTimeline(indicators: IndicatorValue[], behavior: BehaviorSignalItem[]) {
  const safety = indicators.filter(
    (item) => item.type === "safety_valve" && item.signal !== "unavailable",
  );
  const warning = indicators.filter(
    (item) => item.type === "warning_signal" && item.signal !== "unavailable",
  );
  const brokenSafety = safety.filter((item) => item.signal === "red").length;
  const stressedSafety = safety.filter((item) => ["orange", "red"].includes(item.signal)).length;
  const warningsOn = warning.filter((item) => item.signal !== "green").length;
  const policy = behavior.find((item) => item.id === "policy-stress")?.level ?? "green";
  const current =
    ["orange", "red"].includes(policy) ? 4 :
    brokenSafety >= 2 ? 3 :
    stressedSafety >= 1 ? 2 :
    warningsOn >= 2 ? 1 : 0;
  const definitions = [
    ["VULNERABILITY BUILDUP", "脆弱性の蓄積", "割高感や債務など、ショックを増幅する要因が積み上がる"],
    ["WARNING CLUSTER", "警告サイン集積", "市場・雇用・景況感のセンサーが複数点灯する"],
    ["LIQUIDITY THINNING", "流動性の悪化", "資金調達コストが上がり、お金の流れが細り始める"],
    ["CREDIT FREEZE", "信用市場の停止", "借り換えや社債発行が難しくなり、安全弁が複数壊れる"],
    ["POLICY RESPONSE", "緊急政策対応", "中央銀行や政府が緊急流動性・救済策を発動する"],
  ] as const;

  return definitions.map(([english, name, description], index) => ({
    english,
    name,
    description,
    status: index < current ? "passed" : index === current ? "current" : "ahead",
  }));
}

export function buildApocalypseModel(
  indicators: IndicatorValue[],
  news: MarketNewsItem[],
  behavior: BehaviorSignalItem[],
  investors: SmartMoneyInvestor[],
) {
  const newsModel = newsRadar(news);
  const escape = marketEscape(indicators, behavior);
  const defense = wealthyDefense(behavior, investors);
  const components = [
    { key: "safety", label: "安全弁ストレス", score: Math.round(indicatorAverage(indicators, "safety_valve")), weight: 35 },
    { key: "warning", label: "警告サイン", score: Math.round(indicatorAverage(indicators, "warning_signal")), weight: 20 },
    { key: "vulnerability", label: "脆弱性", score: Math.round(indicatorAverage(indicators, "vulnerability")), weight: 20 },
    { key: "escape", label: "資金逃避", score: escape.score, weight: 15 },
    { key: "news", label: "ニュース密度", score: newsModel.score, weight: 10 },
  ];
  const score = Math.round(
    components.reduce((total, component) => total + component.score * component.weight, 0) /
      components.reduce((total, component) => total + component.weight, 0),
  );
  const level = levelForScore(score);

  return {
    score,
    level,
    label:
      level === "red" ? "SEVERE STRESS" :
      level === "orange" ? "ELEVATED RISK" :
      level === "yellow" ? "WATCH MODE" : "CONTAINED",
    comment:
      level === "red"
        ? "複数の安全弁と資金フローに強いストレスが重なっています。"
        : level === "orange"
          ? "警告と脆弱性が重なっています。流動性の悪化連鎖を重点監視します。"
          : level === "yellow"
            ? "安全弁は概ね機能中ですが、一部の警告・脆弱性を継続監視します。"
            : "信用・流動性の安全弁は概ね機能しています。",
    components,
    anomalies: anomalies(indicators),
    timeline: crisisTimeline(indicators, behavior),
    news: newsModel,
    escape,
    defense,
  };
}
