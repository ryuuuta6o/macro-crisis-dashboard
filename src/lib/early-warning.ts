import type { BehaviorSignalItem } from "@/types/behavior";
import type {
  AutomatedCondition,
  AutomatedConditionsData,
} from "@/lib/free-macro-data";
import type {
  IndicatorId,
  IndicatorValue,
  MarketNewsItem,
  RiskLevel,
  Signal,
} from "@/types/indicator";
import { ENERGY_CREDIT_ROUTE_CONFIG } from "@/config/manual-data";
import { detectMarginDebtM2Peakout } from "@/lib/margin-debt-m2";

export type RiskRangeLabel = "低" | "低〜中" | "中" | "中〜高" | "高";
export type ChecklistStatus = "met" | "watch" | "not_met" | "unavailable";
export type VelocityLabel = "安定" | "やや悪化" | "急悪化" | "連鎖悪化";

const riskScore: Record<Signal, number> = {
  green: 5,
  yellow: 38,
  orange: 68,
  red: 100,
  unavailable: 0,
};

const riskRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function average(values: number[], fallback = 0) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;
}

function available(items: Array<IndicatorValue | undefined>) {
  return items.filter(
    (item): item is IndicatorValue => Boolean(item) && item?.signal !== "unavailable",
  );
}

function scoreItems(items: Array<IndicatorValue | undefined>, fallback = 0) {
  return average(available(items).map((item) => riskScore[item.signal]), fallback);
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return "red";
  if (score >= 60) return "orange";
  if (score >= 30) return "yellow";
  return "green";
}

function rangeFromScore(score: number): RiskRangeLabel {
  if (score >= 80) return "高";
  if (score >= 60) return "中〜高";
  if (score >= 40) return "中";
  if (score >= 20) return "低〜中";
  return "低";
}

function numeric(indicators: Map<IndicatorId, IndicatorValue>, id: IndicatorId) {
  return indicators.get(id)?.numericValue ?? null;
}

function thresholdStatus(
  value: number | null,
  threshold: number,
  watchRatio = 0.8,
): ChecklistStatus {
  if (value === null) return "unavailable";
  if (value >= threshold) return "met";
  if (value >= threshold * watchRatio) return "watch";
  return "not_met";
}

function signalStatus(indicator?: IndicatorValue): ChecklistStatus {
  if (!indicator || indicator.signal === "unavailable") return "unavailable";
  if (indicator.signal === "red" || indicator.signal === "orange") return "met";
  if (indicator.signal === "yellow") return "watch";
  return "not_met";
}

function worstSignal(items: IndicatorValue[]): Signal {
  const live = items.filter((item) => item.signal !== "unavailable");
  if (!live.length) return "unavailable";
  return live.reduce<Signal>(
    (worst, item) => riskRank[item.signal] > riskRank[worst] ? item.signal : worst,
    "green",
  );
}

function buildLayerSummary(indicators: IndicatorValue[]) {
  const definitions = [
    {
      id: "vulnerability",
      sourceType: "vulnerability" as const,
      english: "VULNERABILITY",
      japanese: "脆弱性・爆薬",
      description: "ショック時の下落や信用連鎖を大きくする要因",
    },
    {
      id: "trigger",
      sourceType: "warning_signal" as const,
      english: "TRIGGER",
      japanese: "触発・火花",
      description: "リセッションやベア相場の接近を知らせるサイン",
    },
    {
      id: "ignition",
      sourceType: "safety_valve" as const,
      english: "IGNITION",
      japanese: "点火・導火線",
      description: "安全弁の機能低下として表れる信用・流動性ストレス",
    },
  ];

  return definitions.map((definition) => {
    const items = indicators.filter((item) => item.type === definition.sourceType);
    const signal = worstSignal(items);
    const alertCount = items.filter((item) => riskRank[item.signal] >= 1).length;
    return {
      ...definition,
      signal,
      alertCount,
      availableCount: items.filter((item) => item.signal !== "unavailable").length,
      totalCount: items.length,
      status:
        definition.id === "ignition"
          ? signal === "red" ? "点火ストレス" : signal === "orange" ? "点火警戒" : signal === "yellow" ? "接近" : signal === "unavailable" ? "判定待ち" : "未点火"
          : definition.id === "trigger"
            ? signal === "red" ? "強く点灯" : signal === "orange" ? "警戒" : signal === "yellow" ? "点灯中" : signal === "unavailable" ? "判定待ち" : "静穏"
            : signal === "red" ? "高い" : signal === "orange" ? "警戒" : signal === "yellow" ? "蓄積中" : signal === "unavailable" ? "判定待ち" : "抑制的",
    };
  });
}

function buildChecklists(
  indicators: IndicatorValue[],
  behavior: BehaviorSignalItem[],
  automated: AutomatedCondition[],
) {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const hy = numeric(byId, "hy-oas");
  const ig = numeric(byId, "ig-oas");
  const baa = numeric(byId, "baa-aaa");
  const vix = numeric(byId, "vix");
  const policy = behavior.find((item) => item.id === "policy-stress");
  const automatedById = new Map(automated.map((item) => [item.id, item]));
  const automatedRow = (id: AutomatedCondition["id"]) => {
    const item = automatedById.get(id);
    if (!item) {
      return {
        label: id,
        status: "unavailable" as const,
        note: "無料公開APIの取得待ち",
      };
    }
    return {
      label: item.label,
      status: item.status,
      note: `${item.displayValue} · ${item.sourceName} · ${item.observedAt ?? "観測日不明"}`,
      sourceUrl: item.sourceUrl,
      updateFrequency: item.updateFrequency,
    };
  };
  const sustainedVix = (threshold: number): ChecklistStatus => {
    const item = byId.get("vix");
    if (!item || item.numericValue === null) return "unavailable";
    const recent = item.history.slice(0, 3);
    if (recent.length >= 2 && recent.slice(0, 2).every((point) => point.value >= threshold)) return "met";
    return thresholdStatus(item.numericValue, threshold);
  };
  const auction = byId.get("treasury-auction");
  const auctionWeak = auction?.history.slice(0, 2) ?? [];
  const consecutiveAuction: ChecklistStatus =
    !auction || auction.signal === "unavailable"
      ? "unavailable"
      : auctionWeak.length >= 2 && auctionWeak.every((point) => point.value < 2.3)
        ? "met"
        : auction.signal === "yellow" || auction.signal === "red"
          ? "watch"
          : "not_met";
  const fundingStress = available([
    byId.get("sofr"),
    byId.get("fra-ois"),
    byId.get("ted-spread"),
  ]);
  const fundingStatus: ChecklistStatus = fundingStress.some((item) => item.signal === "red")
    ? "met"
    : fundingStress.some((item) => item.signal === "yellow" || item.signal === "orange")
      ? "watch"
      : fundingStress.length ? "not_met" : "unavailable";
  const bankFailures = automatedById.get("bank-failures");
  const bankFailureCount = bankFailures?.numericValue;
  const systemicBankFailure: ChecklistStatus = bankFailureCount === null || bankFailureCount === undefined
    ? "unavailable"
    : bankFailureCount >= 1 ? "met" : "not_met";
  const extremeBankFailure: ChecklistStatus = bankFailureCount === null || bankFailureCount === undefined
    ? "unavailable"
    : bankFailureCount >= 2 ? "met" : bankFailureCount === 1 ? "watch" : "not_met";
  const criticalSafetyStress = [
    byId.get("hy-oas"),
    byId.get("ig-oas"),
    byId.get("baa-aaa"),
    byId.get("sofr"),
    byId.get("discount-window"),
  ].filter((item) => item && (item.signal === "orange" || item.signal === "red")).length;
  const policyActivated = [byId.get("discount-window"), byId.get("btfp")]
    .some((item) => item && item.signal !== "green" && item.signal !== "unavailable");
  const policyStressStatus: ChecklistStatus = policyActivated && criticalSafetyStress >= 2
    ? "met"
    : policyActivated || criticalSafetyStress >= 1
      ? "watch"
      : "not_met";

  const groups = [
    {
      id: "recession",
      title: "Recession Checklist",
      japanese: "景気後退条件",
      items: [
        automatedRow("recession-probability"),
        automatedRow("consumer-sentiment"),
        automatedRow("economic-activity"),
        { label: "失業保険申請250K超", status: thresholdStatus(numeric(byId, "icsa"), 250), note: "Initial Claims" },
        automatedRow("sahm-rule"),
        automatedRow("nfp-revision"),
        automatedRow("payroll-momentum"),
      ],
    },
    {
      id: "systemic",
      title: "Systemic Crisis Checklist",
      japanese: "システミック危機条件",
      items: [
        { label: "HY OAS 400bp超", status: thresholdStatus(hy, 400), note: hy === null ? "データ待ち" : `${hy.toFixed(0)}bp` },
        { label: "IG OAS 1.5%超", status: thresholdStatus(ig, 1.5), note: ig === null ? "データ待ち" : `${ig.toFixed(2)}%` },
        { label: "BAA-AAA 2.0%超", status: thresholdStatus(baa, 2), note: baa === null ? "データ待ち" : `${baa.toFixed(2)}%` },
        { label: "VIX 30定着", status: sustainedVix(30), note: vix === null ? "データ待ち" : vix.toFixed(1) },
        { label: "銀行預金流出加速", status: signalStatus(byId.get("bank-deposit-outflow")), note: "週次フロー" },
        { label: "Discount Window急増", status: signalStatus(byId.get("discount-window")), note: "FRB緊急貸出" },
        { label: "国債入札不調が連続", status: consecutiveAuction, note: "長期債応札倍率" },
        {
          label: "FDIC銀行破綻（90日以内）",
          status: systemicBankFailure,
          note: bankFailures ? `${bankFailures.displayValue} · ${bankFailures.note}` : "FDIC API取得待ち",
          sourceUrl: bankFailures?.sourceUrl,
          updateFrequency: bankFailures?.updateFrequency,
        },
      ],
    },
    {
      id: "extreme",
      title: "Extreme Crisis Checklist",
      japanese: "極端危機条件",
      items: [
        { label: "HY OAS 600bp超", status: thresholdStatus(hy, 600), note: hy === null ? "データ待ち" : `${hy.toFixed(0)}bp` },
        { label: "VIX 40定着", status: sustainedVix(40), note: vix === null ? "データ待ち" : vix.toFixed(1) },
        {
          label: "FDIC銀行破綻が90日以内に複数",
          status: extremeBankFailure,
          note: bankFailures ? `${bankFailures.displayValue} · ${bankFailures.note}` : "FDIC API取得待ち",
          sourceUrl: bankFailures?.sourceUrl,
          updateFrequency: bankFailures?.updateFrequency,
        },
        { label: "SOFR / Repoストレス", status: fundingStatus, note: "SOFR・FRA-OIS・TED" },
        { label: "国債入札不調が連続", status: consecutiveAuction, note: "長期債応札倍率" },
        {
          label: "緊急支援後も安全弁ストレス",
          status: policyStressStatus,
          note: `Discount Window / BTFPと主要安全弁を自動照合${policy?.level === "red" ? " · 行動シグナルも警戒" : ""}`,
        },
      ],
    },
  ];

  return groups.map((group) => ({
    ...group,
    metCount: group.items.filter((item) => item.status === "met").length,
    watchCount: group.items.filter((item) => item.status === "watch").length,
    availableCount: group.items.filter((item) => item.status !== "unavailable").length,
  }));
}

function buildRiskRanges(
  indicators: IndicatorValue[],
  checklists: ReturnType<typeof buildChecklists>,
) {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const safety = indicators.filter((item) => item.type === "safety_valve");
  const warnings = indicators.filter((item) => item.type === "warning_signal");
  const vulnerabilities = indicators.filter((item) => item.type === "vulnerability");
  const recessionInputs = [byId.get("icsa"), byId.get("sloos"), byId.get("dgs10"), byId.get("dgs30")];
  const bearInputs = [byId.get("vix"), byId.get("move"), byId.get("dgs10"), byId.get("dgs30"), byId.get("shiller-cape"), byId.get("buffett-indicator"), byId.get("margin-debt-gdp"), byId.get("margin-debt-m2")];
  const systemicChecklist = checklists.find((item) => item.id === "systemic")!;
  const extremeChecklist = checklists.find((item) => item.id === "extreme")!;
  const recessionChecklist = checklists.find((item) => item.id === "recession")!;
  const ignitionScore = scoreItems(safety);
  const triggerScore = scoreItems(warnings);
  const vulnerabilityScore = scoreItems(vulnerabilities);
  const criticalIgnition = available([
    byId.get("hy-oas"), byId.get("ig-oas"), byId.get("baa-aaa"),
    byId.get("sofr"), byId.get("fra-ois"), byId.get("ted-spread"),
  ]);
  const criticalStress = criticalIgnition.some((item) => riskRank[item.signal] >= 1);
  const systemicRaw = ignitionScore * 0.7 + triggerScore * 0.2 + vulnerabilityScore * 0.1 + systemicChecklist.metCount * 5;
  const systemicScore = criticalStress ? clamp(systemicRaw) : Math.min(24, systemicRaw);
  const extremeRaw = ignitionScore * 0.65 + triggerScore * 0.15 + extremeChecklist.metCount * 12;
  const extremeScore = extremeChecklist.metCount > 0 ? clamp(extremeRaw) : Math.min(19, extremeRaw);
  const items = [
    {
      id: "recession",
      english: "RECESSION RISK",
      japanese: "景気後退リスク",
      score: clamp(
        scoreItems(recessionInputs) * 0.5 +
        triggerScore * 0.25 +
        recessionChecklist.metCount * 8 +
        recessionChecklist.watchCount * 3,
      ),
      coverage: recessionChecklist.availableCount,
      total: recessionChecklist.items.length,
      comment: "雇用、金利、信用供給と警告サインの組み合わせを確認します。",
    },
    {
      id: "bear",
      english: "BEAR MARKET RISK",
      japanese: "ベア相場リスク",
      score: clamp(scoreItems(bearInputs) * 0.6 + vulnerabilityScore * 0.25 + triggerScore * 0.15),
      coverage: available(bearInputs).length,
      total: bearInputs.length,
      comment: "ボラティリティ、長期金利、株式市場の脆弱性を重視します。",
    },
    {
      id: "systemic",
      english: "SYSTEMIC CRISIS RISK",
      japanese: "システミック危機リスク",
      score: systemicScore,
      coverage: systemicChecklist.availableCount,
      total: systemicChecklist.items.length,
      comment: "信用・流動性の安全弁悪化を最重要視し、脆弱性単独では高判定にしません。",
    },
    {
      id: "extreme",
      english: "EXTREME CRISIS RISK",
      japanese: "極端危機リスク",
      score: extremeScore,
      coverage: extremeChecklist.availableCount,
      total: extremeChecklist.items.length,
      comment: "極端な信用スプレッド、VIX、銀行・資金市場の同時ストレスを確認します。",
    },
  ];

  return items.map((item) => ({
    ...item,
    score: Math.round(item.score),
    range: rangeFromScore(item.score),
    level: levelFromScore(item.score),
    confidence: item.coverage / item.total >= 0.7 ? "標準" : item.coverage / item.total >= 0.4 ? "限定的" : "データ不足",
  }));
}

type DistanceDefinition = {
  id: IndicatorId;
  label: string;
  thresholds?: number[];
  thresholdLabels?: string[];
  decimals: number;
  unit: string;
  lowerIsWorse?: boolean;
};

type IgnitionDistanceRow = DistanceDefinition & {
  value: number | null;
  signal: Signal;
  nextLabel: string;
  distance: number | null;
  breached: boolean;
};

function buildIgnitionDistances(indicators: IndicatorValue[]) {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const definitions: DistanceDefinition[] = [
    { id: "hy-oas", label: "HY OAS", thresholds: [400, 500, 600], thresholdLabels: ["注意線", "強い警戒線", "危機線"], decimals: 0, unit: "bp" },
    { id: "baa-aaa", label: "BAA-AAA", thresholds: [2, 3], thresholdLabels: ["点火線", "危機線"], decimals: 2, unit: "%" },
    { id: "ig-oas", label: "IG OAS", thresholds: [1, 1.5, 3], thresholdLabels: ["注意線", "点火線", "危機線"], decimals: 2, unit: "%" },
    { id: "vix", label: "VIX", thresholds: [30, 40], thresholdLabels: ["警戒線", "パニック線"], decimals: 1, unit: "" },
    { id: "fra-ois", label: "FRA-OIS proxy", thresholds: [20, 50], thresholdLabels: ["警戒線", "危機線"], decimals: 0, unit: "bp" },
    { id: "ted-spread", label: "TED proxy", thresholds: [0.3, 0.6], thresholdLabels: ["警戒線", "危機線"], decimals: 2, unit: "%" },
    { id: "treasury-auction", label: "Treasury Auction", thresholds: [2.3, 2.1], thresholdLabels: ["需要注意線", "不調線"], decimals: 2, unit: "x", lowerIsWorse: true },
  ];

  const rows: IgnitionDistanceRow[] = definitions.map((definition) => {
    const item = byId.get(definition.id);
    const value = item?.numericValue ?? null;
    if (!item || value === null || !definition.thresholds) {
      return { ...definition, value, signal: "unavailable" as Signal, nextLabel: "データ待ち", distance: null, breached: false };
    }
    let index = definition.lowerIsWorse
      ? definition.thresholds.findIndex((threshold) => value > threshold)
      : definition.thresholds.findIndex((threshold) => value < threshold);
    if (index < 0) index = definition.thresholds.length - 1;
    const threshold = definition.thresholds[index];
    const breached = definition.lowerIsWorse ? value <= threshold : value >= threshold;
    const distance = Math.abs(value - threshold);
    return {
      ...definition,
      value,
      signal: item.signal,
      nextLabel: breached
        ? `${definition.thresholdLabels?.[index] ?? "警戒線"}を通過`
        : `${definition.thresholdLabels?.[index] ?? "警戒線"} ${threshold.toFixed(definition.decimals)}${definition.unit}まで`,
      distance,
      breached,
    };
  });

  const sofr = byId.get("sofr");
  const sofrChange = sofr?.numericValue !== null && sofr?.previousNumericValue !== null && sofr
    ? Math.abs(sofr.numericValue - sofr.previousNumericValue)
    : null;
  rows.splice(4, 0, {
    id: "sofr",
    label: "SOFR / Repo",
    decimals: 2,
    unit: "%",
    value: sofr?.numericValue ?? null,
    signal: sofr?.signal ?? "unavailable",
    nextLabel: sofrChange === null ? "変化幅データ待ち" : `日次急変0.10%まで`,
    distance: sofrChange === null ? null : Math.max(0, 0.1 - sofrChange),
    breached: sofrChange !== null && sofrChange >= 0.1,
  });
  return rows;
}

const velocityDefinitions: Array<{
  id: IndicatorId;
  label: string;
  sensitivity: number;
  category: string;
  lowerIsWorse?: boolean;
}> = [
  { id: "hy-oas", label: "HY OAS", sensitivity: 100, category: "credit" },
  { id: "ig-oas", label: "IG OAS", sensitivity: 0.5, category: "credit" },
  { id: "baa-aaa", label: "BAA-AAA", sensitivity: 0.5, category: "credit" },
  { id: "vix", label: "VIX", sensitivity: 10, category: "volatility" },
  { id: "move", label: "MOVE", sensitivity: 30, category: "volatility" },
  { id: "dgs10", label: "米10年債", sensitivity: 0.5, category: "rates" },
  { id: "dgs30", label: "米30年債", sensitivity: 0.3, category: "rates" },
  { id: "sofr", label: "SOFR", sensitivity: 0.1, category: "funding" },
  { id: "bank-deposit-outflow", label: "銀行預金流出", sensitivity: 25, category: "funding", lowerIsWorse: true },
  { id: "mmf-assets", label: "MMF", sensitivity: 25, category: "funding" },
  { id: "icsa", label: "失業保険", sensitivity: 25, category: "economy" },
];

function historicalChange(indicator: IndicatorValue, days: number) {
  if (indicator.history.length < 2) return null;
  const latest = indicator.history[0];
  const targetTime = new Date(`${latest.date}T00:00:00Z`).getTime() - days * 86_400_000;
  const comparison = indicator.history.find(
    (point, index) => index > 0 && new Date(`${point.date}T00:00:00Z`).getTime() <= targetTime,
  );
  return comparison ? {
    change: latest.value - comparison.value,
    currentValue: latest.value,
    comparisonValue: comparison.value,
    currentDate: latest.date,
    comparisonDate: comparison.date,
  } : null;
}

function buildVelocity(indicators: IndicatorValue[], news: MarketNewsItem[]) {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const periods = [1, 7, 30].map((days) => {
    const changes = velocityDefinitions.flatMap((definition) => {
      const indicator = byId.get(definition.id);
      if (!indicator) return [];
      const historical = historicalChange(indicator, days);
      if (historical === null) return [];
      const directional = historical.change * (definition.lowerIsWorse ? -1 : 1);
      return [{
        ...definition,
        ...historical,
        normalized: directional / definition.sensitivity,
        unit: indicator.unit,
        decimals: indicator.decimals,
      }];
    });
    const recentNews = news.filter((item) =>
      Date.now() - new Date(item.publishedAt).getTime() <= days * 86_400_000,
    );
    const olderNews = news.filter((item) => {
      const age = Date.now() - new Date(item.publishedAt).getTime();
      return age > days * 86_400_000 && age <= days * 2 * 86_400_000;
    });
    if (recentNews.length && olderNews.length) {
      const newsDelta = average(recentNews.map((item) => item.impactScore)) - average(olderNews.map((item) => item.impactScore));
      changes.push({
        id: "vix",
        label: "重要ニュース密度",
        sensitivity: 10,
        category: "news",
        change: newsDelta,
        currentValue: average(recentNews.map((item) => item.impactScore)),
        comparisonValue: average(olderNews.map((item) => item.impactScore)),
        currentDate: "直近期間",
        comparisonDate: "前期間",
        normalized: newsDelta / 10,
        unit: "pt",
        decimals: 1,
      });
    }
    const worsening = changes.filter((item) => item.normalized >= 0.2);
    const categories = new Set(worsening.map((item) => item.category));
    const triple = ["hy-oas", "ig-oas", "vix"].every((id) =>
      changes.some((item) => item.id === id && item.normalized > 0),
    );
    const chain = triple || (categories.size >= 3 && worsening.length >= 4);
    const peak = Math.max(0, ...changes.map((item) => item.normalized));
    const mean = average(worsening.map((item) => item.normalized));
    const label: VelocityLabel = chain
      ? "連鎖悪化"
      : peak >= 1.5 || mean >= 0.75
        ? "急悪化"
        : worsening.length
          ? "やや悪化"
          : "安定";
    return {
      days,
      period: days === 1 ? "1日" : `${days}日`,
      label,
      level: label === "連鎖悪化" ? "red" as const : label === "急悪化" ? "orange" as const : label === "やや悪化" ? "yellow" as const : "green" as const,
      availableCount: changes.length,
      topChanges: [
        ...(worsening.length ? worsening : changes),
      ].sort((a, b) => b.normalized - a.normalized).slice(0, 3),
    };
  });
  const severity: Record<VelocityLabel, number> = { "安定": 0, "やや悪化": 1, "急悪化": 2, "連鎖悪化": 3 };
  const overall = periods.reduce((worst, period) => severity[period.label] > severity[worst.label] ? period : worst, periods[0]);
  return { overall: overall.label, level: overall.level, periods };
}

function buildRoutes(indicators: IndicatorValue[], news: MarketNewsItem[]) {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const sourceFallback: Record<IndicatorValue["source"], string> = {
    FRED: "FRED",
    treasury: "U.S. Treasury",
    "ny-fed": "New York Fed",
    "fiscal-data": "U.S. Treasury Fiscal Data",
    "market-data": "市場データ",
    published: "公表資料",
    manual: "手動管理",
    unavailable: "取得不可",
  };
  const indicatorMetric = (item: IndicatorValue) => ({
    name: item.name,
    value: item.numericValue === null
      ? item.value === null ? "取得不可" : String(item.value)
      : `${item.numericValue.toFixed(item.decimals)}${item.unit}`,
    signal: item.signal,
    source: item.sourceLabel ?? item.sourceName ?? (
      item.source === "FRED" && item.fredSeries.length
        ? `FRED ${item.fredSeries.join(" / ")}`
        : sourceFallback[item.source]
    ),
    sourceUrl: item.sourceUrl ?? (
      item.source === "FRED" && item.fredSeries.length
        ? `https://fred.stlouisfed.org/graph/?id=${item.fredSeries.join(",")}`
        : undefined
    ),
    observationDate: item.observationDate,
    criteria: item.thresholdLabel,
    updateFrequency: item.updateFrequency ?? (
      item.source === "FRED" ? "15分ごと再検証 / 元系列の公表時更新" : "公表資料の更新時"
    ),
    dataMode: ["FRED", "treasury", "ny-fed", "fiscal-data", "market-data"].includes(item.source)
      ? "自動取得"
      : item.source === "unavailable" ? "未取得" : "公表値",
  });
  const indicatorNode = (
    label: string,
    ids: IndicatorId[],
    basis: string,
  ) => {
    const items = ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
    const liveItems = available(items);
    return {
      label,
      signal: worstSignal(liveItems),
      basis,
      metrics: items.map(indicatorMetric),
    };
  };
  const manualMetric = ({
    name,
    value,
    signal,
    criteria,
    source,
    sourceUrl,
    observationDate,
    updateFrequency,
  }: {
    name: string;
    value: string;
    signal: Signal;
    criteria: string;
    source: string;
    sourceUrl?: string;
    observationDate: string | null;
    updateFrequency: string;
  }) => ({
    name,
    value,
    signal,
    source,
    sourceUrl,
    observationDate,
    criteria,
    updateFrequency,
    dataMode: "公表値",
  });
  const newsNode = (label: string, terms: string[]) => {
    const matched = news.filter((item) => terms.some((term) => `${item.title} ${item.impactCategory}`.toLowerCase().includes(term)));
    const signal: Signal = matched.some((item) => item.impactLevel === "red")
      ? "red"
      : matched.length ? "yellow" : "green";
    return {
      label,
      signal,
      basis: "市場インパクトニュースの見出し一致を補助シグナルとして使用",
      metrics: [{
        name: "関連ニュース",
        value: `${matched.length}件`,
        signal,
        source: "GDELT + FRB・FDIC・SEC公的RSS",
        sourceUrl: undefined,
        observationDate: matched[0]?.publishedAt.slice(0, 10) ?? null,
        criteria: "赤判定の記事あり=赤 / 関連記事あり=黄 / 該当なし=緑",
        updateFrequency: "5分ごと再検証",
        dataMode: "自動取得",
      }],
    };
  };
  const policyNode = indicatorNode(
    "政策対応",
    ["discount-window", "btfp"],
    "FRB緊急貸出とBTFPのうち最も強い信号",
  );
  const oilConfig = ENERGY_CREDIT_ROUTE_CONFIG.oilVsShaleBreakeven;
  const energyHyConfig = ENERGY_CREDIT_ROUTE_CONFIG.energyHySpread;
  const oilSignal: Signal = oilConfig.oilPriceUsd <= oilConfig.shaleBreakevenLowUsd
    ? "red"
    : oilConfig.oilPriceUsd <= oilConfig.shaleBreakevenHighUsd
      ? "yellow"
      : "green";
  const oilMomentumSignal: Signal = oilConfig.oilPriceUsd < oilConfig.previousOilPriceUsd
    ? oilSignal === "green" ? "yellow" : oilSignal
    : oilSignal;
  const energyHySignal: Signal = energyHyConfig.valueBp >= energyHyConfig.redBp
    ? "red"
    : energyHyConfig.valueBp >= energyHyConfig.warningBp
      ? "yellow"
      : "green";
  const routes = [
    {
      id: "inflation",
      title: "Inflation / Supply Shock Route",
      japanese: "インフレ・供給ショック経路",
      nodes: [
        newsNode("コモディティニュース", ["oil", "commodity", "energy"]),
        newsNode("インフレニュース", ["inflation", "cpi"]),
        newsNode("中央銀行ニュース", ["federal reserve", "hawkish"]),
        indicatorNode("雇用悪化", ["icsa"], "失業保険申請件数の信号"),
        indicatorNode("信用悪化", ["hy-oas", "ig-oas"], "HY OASとIG OASのうち最も強い信号"),
      ],
    },
    {
      id: "credit",
      title: "Credit Bubble Collapse Route",
      japanese: "信用バブル崩壊経路",
      nodes: [
        indicatorNode("CRE / Private Credit", ["office-cmbs", "private-credit-default", "pik-ratio"], "3指標のうち最も強い信号"),
        indicatorNode("信用スプレッド", ["hy-oas", "ig-oas", "baa-aaa"], "HY・IG・BAA-AAAのうち最も強い信号"),
        indicatorNode("貸出態度 / 短期資金", ["sloos", "sofr"], "SLOOSとSOFRのうち最も強い信号"),
        indicatorNode("ローン・デフォルト", ["leveraged-loan-default"], "レバレッジドローン・デフォルト率の信号。企業倒産全体ではない"),
        indicatorNode("銀行流動性・資本", ["discount-window", "bank-deposit-outflow", "bank-cet1"], "緊急貸出・預金フロー・CET1のうち最も強い信号"),
      ],
    },
    {
      id: "sovereign",
      title: "Sovereign / Liquidity Route",
      japanese: "国債・流動性経路",
      nodes: [
        indicatorNode("国債入札", ["treasury-auction"], "長期国債入札の応札倍率"),
        indicatorNode("長期金利 / MOVE", ["dgs10", "dgs30", "move"], "10年・30年金利とMOVEのうち最も強い信号"),
        indicatorNode("Repo / SOFR", ["sofr", "fra-ois", "ted-spread"], "短期資金3指標のうち最も強い信号"),
        indicatorNode("銀行流動性", ["bank-deposit-outflow", "discount-window"], "預金フローと緊急貸出のうち最も強い信号"),
        policyNode,
      ],
    },
    {
      id: "energy-credit",
      title: "Energy Credit Paradox Route",
      japanese: "原油安・シェール信用経路",
      nodes: [
        {
          label: "原油価格低下",
          signal: oilMomentumSignal,
          basis: "原油安はインフレにはプラスでも、シェール採算を割るとエネルギーHYの信用不安へ転化し得ます。",
          metrics: [manualMetric({
            name: "WTI vs シェール採算",
            value: `$${oilConfig.oilPriceUsd.toFixed(0)} / 採算$${oilConfig.shaleBreakevenLowUsd}-${oilConfig.shaleBreakevenHighUsd}`,
            signal: oilMomentumSignal,
            criteria: `採算上限$${oilConfig.shaleBreakevenHighUsd}以下=黄 / 採算下限$${oilConfig.shaleBreakevenLowUsd}以下=赤。前回比下落時は注意を一段強めます。`,
            source: oilConfig.sourceName,
            sourceUrl: oilConfig.sourceUrl,
            observationDate: oilConfig.observationDate,
            updateFrequency: oilConfig.updateFrequency,
          })],
        },
        {
          label: "シェール採算悪化",
          signal: oilSignal,
          basis: "原油が採算ラインに近づくほど、掘削・借換・債務返済への圧力が高まる前提で監視します。",
          metrics: [manualMetric({
            name: "採算ライン接近度",
            value: `$${(oilConfig.oilPriceUsd - oilConfig.shaleBreakevenHighUsd).toFixed(0)}`,
            signal: oilSignal,
            criteria: "採算上限を下回ると黄、採算下限を下回ると赤。",
            source: oilConfig.sourceName,
            sourceUrl: oilConfig.sourceUrl,
            observationDate: oilConfig.observationDate,
            updateFrequency: oilConfig.updateFrequency,
          })],
        },
        {
          label: "Energy HY Spread",
          signal: energyHySignal,
          basis: "エネルギー関連ハイイールドの資金調達ストレスを手動公表値で監視します。",
          metrics: [manualMetric({
            name: "Energy HY OAS",
            value: `${energyHyConfig.valueBp.toFixed(0)}bp`,
            signal: energyHySignal,
            criteria: `${energyHyConfig.warningBp}bp以上=黄 / ${energyHyConfig.redBp}bp以上=赤`,
            source: energyHyConfig.sourceName,
            sourceUrl: energyHyConfig.sourceUrl,
            observationDate: energyHyConfig.observationDate,
            updateFrequency: energyHyConfig.updateFrequency,
          })],
        },
        indicatorNode("HY OAS波及", ["hy-oas"], "エネルギーHYストレスが市場全体のHY OASへ波及しているか"),
        indicatorNode("信用市場全体", ["hy-oas", "ig-oas", "baa-aaa"], "HY・IG・BAA-AAAのうち最も強い信号"),
      ],
    },
  ];

  return routes.map((route) => {
    let currentIndex = -1;
    for (let index = 0; index < route.nodes.length; index += 1) {
      if (riskRank[route.nodes[index].signal] < 1) break;
      currentIndex = index;
    }
    const progressingNodes = currentIndex >= 0
      ? route.nodes.slice(0, currentIndex + 1)
      : [];
    const signal = progressingNodes.length
      ? progressingNodes.reduce<Signal>((worst, node) =>
        riskRank[node.signal] > riskRank[worst] ? node.signal : worst, "green")
      : route.nodes.every((node) => node.signal === "unavailable")
        ? "unavailable" as const
        : "green" as const;
    const detachedAlertCount = route.nodes
      .slice(currentIndex + 1)
      .filter((node) => riskRank[node.signal] >= 1).length;
    return {
      ...route,
      signal,
      currentIndex,
      detachedAlertCount,
      progressLabel: currentIndex < 0
        ? "連続進行なし"
        : `第${currentIndex + 1}段階まで連続`,
    };
  });
}

export function buildEarlyWarningModel(
  indicators: IndicatorValue[],
  news: MarketNewsItem[],
  behavior: BehaviorSignalItem[],
  automated?: AutomatedConditionsData,
) {
  const automation = automated ?? {
    items: [],
    fetchedAt: new Date(0).toISOString(),
    unavailableCount: 6,
  };
  const checklists = buildChecklists(indicators, behavior, automation.items);
  const marginDebtM2 = indicators.find((item) => item.id === "margin-debt-m2");
  const leveragePeakout = marginDebtM2
    ? detectMarginDebtM2Peakout(marginDebtM2.history)
    : null;
  return {
    ranges: buildRiskRanges(indicators, checklists),
    velocity: buildVelocity(indicators, news),
    ignitionDistances: buildIgnitionDistances(indicators),
    checklists,
    routes: buildRoutes(indicators, news),
    layers: buildLayerSummary(indicators),
    leverageRollbackPrecursor: leveragePeakout?.detected ?? false,
    leverageRollbackStatus: leveragePeakout,
    automation: {
      fetchedAt: automation.fetchedAt,
      availableCount: automation.items.length - automation.unavailableCount,
      totalCount: automation.items.length || 6,
    },
  };
}

export type EarlyWarningModel = ReturnType<typeof buildEarlyWarningModel>;
