import type { GlobalRiskData } from "@/types/global-risk";
import type {
  AutomatedCondition,
  AutomatedConditionId,
  AutomatedConditionsData,
} from "@/lib/free-macro-data";
import type {
  Importance,
  IndicatorId,
  IndicatorHistoryPoint,
  IndicatorValue,
  NumericThreshold,
  Signal,
} from "@/types/indicator";

export type RiskCompositionIndicator = {
  id: string;
  name: string;
  value: number | string | null;
  numericValue: number | null;
  previousNumericValue?: number | null;
  signal: Signal;
  previousSignal?: Signal;
  importance: Importance;
  unit: string;
  decimals: number;
  threshold?: NumericThreshold;
  thresholdDirection?: "higher-is-worse" | "lower-is-worse";
  thresholdLabel: string;
  fredSeries: string[];
  source: IndicatorValue["source"];
  sourceName?: string;
  sourceUrl?: string;
  observationDate: string | null;
  history: IndicatorHistoryPoint[];
};

export type RiskMeterDirection = "worse" | "better" | "unchanged" | "unavailable";

export type RiskMeterItem = {
  id: string;
  name: string;
  description: string;
  componentLabel: string;
  score: number | null;
  signal: Signal;
  direction: RiskMeterDirection;
  directionLabel: string;
  availableCount: number;
  totalCount: number;
  proHref: string;
  indicators: RiskCompositionIndicator[];
};

export type RiskCompositionCategoryId =
  | "equity-overheat"
  | "credit-market"
  | "rates-treasury"
  | "economic-slowdown"
  | "bank-liquidity"
  | "geopolitical-other";

export type RiskCompositionSignalCounts = Record<Signal, number>;

export type RiskCompositionCategory = {
  id: RiskCompositionCategoryId;
  name: string;
  shortName: string;
  description: string;
  weatherLabel: "晴れ" | "くもり" | "雨" | "雷" | "観測待ち";
  signal: Signal;
  rawScore: number;
  contribution: number;
  indicators: RiskCompositionIndicator[];
  unavailableItems: string[];
  counts: RiskCompositionSignalCounts;
  proHref: string;
  detailNote: string;
  componentLabels: string[];
};

export type RiskCompositionModel = {
  generatedAt: string;
  totalScore: number;
  calm: boolean;
  signal: Signal;
  summary: string;
  categories: RiskCompositionCategory[];
  meters: RiskMeterItem[];
};

type CategoryDefinition = {
  id: RiskCompositionCategoryId;
  name: string;
  shortName: string;
  description: string;
  indicatorIds: IndicatorId[];
  automatedIds: AutomatedConditionId[];
  unavailableItems: string[];
  proHref: string;
  detailNote: string;
  componentLabels: string[];
};

type MeterDefinition = {
  id: string;
  name: string;
  description: string;
  componentLabel: string;
  indicatorIds: IndicatorId[];
  automatedIds: AutomatedConditionId[];
  proHref: string;
};

const definitions: CategoryDefinition[] = [
  {
    id: "equity-overheat",
    name: "株式市場の過熱",
    shortName: "株式過熱",
    description: "割高感と借入レバレッジの雲",
    indicatorIds: [
      "shiller-cape",
      "buffett-indicator",
      "margin-debt-gdp",
      "margin-debt-m2",
    ],
    automatedIds: [],
    unavailableItems: ["Forward PE"],
    proHref: "/#risk-composition-equity-overheat",
    detailNote:
      "割高感とレバレッジは損失を増幅する脆弱性です。単独で点火や時期を判定しません。",
    componentLabels: ["株価の割高感", "信用買い残", "レバレッジ"],
  },
  {
    id: "credit-market",
    name: "信用市場",
    shortName: "信用",
    description: "企業がお金を借りる時の空模様",
    indicatorIds: ["hy-oas", "ig-oas", "ccc-oas", "baa-aaa"],
    automatedIds: [],
    unavailableItems: [],
    proHref: "/#risk-composition-credit-market",
    detailNote:
      "信用悪化は低格付けのCCCからHY、さらにIGへ広がる経路を重点的に確認します。必ず同じ順番になるわけではありません。",
    componentLabels: ["CCC社債", "HY社債", "IG社債", "社債格差"],
  },
  {
    id: "rates-treasury",
    name: "金利・国債",
    shortName: "金利",
    description: "長期金利と国債需要の雲",
    indicatorIds: ["dgs10", "dgs30", "treasury-auction", "move"],
    automatedIds: ["term-premium"],
    unavailableItems: [],
    proHref: "/#risk-composition-rates-treasury",
    detailNote:
      "長期金利、債券市場の変動、国債入札を合わせ、資金調達環境への圧力を確認します。",
    componentLabels: ["10年・30年金利", "タームプレミアム", "国債入札", "債券変動"],
  },
  {
    id: "economic-slowdown",
    name: "景気の弱まり",
    shortName: "景気",
    description: "雇用・消費・住宅の雲",
    indicatorIds: ["icsa"],
    automatedIds: ["sahm-rule", "consumer-sentiment", "housing-supply"],
    unavailableItems: [],
    proHref: "/#risk-composition-economic-slowdown",
    detailNote:
      "雇用の先行変化を中心に見ます。未取得の景気系列は推測せず、取得未実装として分離します。",
    componentLabels: ["失業保険", "サームルール", "消費者心理", "住宅供給"],
  },
  {
    id: "bank-liquidity",
    name: "銀行・流動性",
    shortName: "銀行・流動性",
    description: "銀行と短期資金のお金の流れ",
    indicatorIds: [
      "sofr",
      "ted-spread",
      "fra-ois",
      "bank-deposit-outflow",
      "mmf-assets",
      "discount-window",
      "btfp",
      "bank-cet1",
      "fdic-dif",
    ],
    automatedIds: ["sofr-iorb"],
    unavailableItems: [],
    proHref: "/#risk-composition-bank-liquidity",
    detailNote:
      "預金移動、緊急貸出、短期調達、銀行資本を合わせ、お金の流れが細っていないかを確認します。",
    componentLabels: ["SOFR-IORB", "銀行預金", "MMF", "緊急貸出", "銀行資本"],
  },
  {
    id: "geopolitical-other",
    name: "地政学・その他",
    shortName: "地政学",
    description: "供給網・制裁・地域情勢の雲",
    indicatorIds: [],
    automatedIds: [],
    unavailableItems: [],
    proHref: "/global-risk",
    detailNote:
      "世界リスクマップの手動調査データを集約します。市場価格のリアルタイム指標ではありません。",
    componentLabels: ["地政学", "供給網", "制裁", "地域情勢"],
  },
];

const meterDefinitions: MeterDefinition[] = [
  {
    id: "credit-market",
    name: "信用市場",
    description: "企業の資金調達ストレス",
    componentLabel: "HY・IG・CCC・BAA/AAA",
    indicatorIds: ["hy-oas", "ig-oas", "ccc-oas", "baa-aaa"],
    automatedIds: [],
    proHref: "/#risk-composition-credit-market",
  },
  {
    id: "rates-treasury",
    name: "金利・国債",
    description: "長期金利と国債市場の圧力",
    componentLabel: "10年・30年・MOVE・入札・タームプレミアム",
    indicatorIds: ["dgs10", "dgs30", "move", "treasury-auction"],
    automatedIds: ["term-premium"],
    proHref: "/#risk-composition-rates-treasury",
  },
  {
    id: "short-term-liquidity",
    name: "短期流動性",
    description: "短期のお金の流れと銀行間調達",
    componentLabel: "SOFR・SOFR-IORB・FRA-OIS・TED",
    indicatorIds: ["sofr", "fra-ois", "ted-spread"],
    automatedIds: ["sofr-iorb"],
    proHref: "/#risk-composition-bank-liquidity",
  },
  {
    id: "equity-volatility",
    name: "株式ボラティリティ",
    description: "株式市場の不安心理",
    componentLabel: "VIX",
    indicatorIds: ["vix"],
    automatedIds: [],
    proHref: "/#indicator-vix",
  },
  {
    id: "commercial-real-estate",
    name: "商業不動産",
    description: "商業用不動産ローンの傷み",
    componentLabel: "Office CMBS・CMBS全体",
    indicatorIds: ["office-cmbs", "cmbs-total"],
    automatedIds: [],
    proHref: "/#indicator-office-cmbs",
  },
  {
    id: "private-credit",
    name: "Private Credit",
    description: "非公開融資市場の信用劣化",
    componentLabel: "Default・PIK・Leveraged Loan",
    indicatorIds: ["private-credit-default", "pik-ratio", "leveraged-loan-default"],
    automatedIds: [],
    proHref: "/#indicator-private-credit-default",
  },
  {
    id: "equity-vulnerability",
    name: "株式市場の脆弱性",
    description: "割高感とレバレッジの蓄積",
    componentLabel: "CAPE・Buffett・Margin Debt/GDP・Margin Debt/M2",
    indicatorIds: ["shiller-cape", "buffett-indicator", "margin-debt-gdp", "margin-debt-m2"],
    automatedIds: [],
    proHref: "/#risk-composition-equity-overheat",
  },
  {
    id: "economic-employment",
    name: "景気・雇用",
    description: "雇用、消費、住宅の弱まり",
    componentLabel: "失業保険・Sahm・消費者心理・住宅供給",
    indicatorIds: ["icsa"],
    automatedIds: ["sahm-rule", "consumer-sentiment", "housing-supply"],
    proHref: "/#risk-composition-economic-slowdown",
  },
  {
    id: "bank-resilience",
    name: "銀行の防衛力",
    description: "預金、緊急貸出、銀行資本",
    componentLabel: "預金・MMF・Discount Window・BTFP・CET1・FDIC",
    indicatorIds: ["bank-deposit-outflow", "mmf-assets", "discount-window", "btfp", "bank-cet1", "fdic-dif"],
    automatedIds: [],
    proHref: "/#risk-composition-bank-liquidity",
  },
  {
    id: "household-credit-supply",
    name: "家計・信用供給",
    description: "家計返済負担と銀行の貸出姿勢",
    componentLabel: "家計債務/GDP・DSR・SLOOS",
    indicatorIds: ["household-debt-gdp", "household-dsr", "sloos"],
    automatedIds: [],
    proHref: "/#classification-summary-fold",
  },
  {
    id: "geopolitical-other",
    name: "地政学・その他",
    description: "供給網、制裁、地域情勢",
    componentLabel: "世界リスクマップの地域別調査",
    indicatorIds: [],
    automatedIds: [],
    proHref: "/global-risk",
  },
];

const signalPoints: Record<Signal, number | null> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
  unavailable: null,
};

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const meterSignalScore: Record<Signal, number | null> = {
  green: 20,
  yellow: 48,
  orange: 70,
  red: 90,
  unavailable: null,
};

const importanceWeight: Record<IndicatorValue["importance"], number> = {
  critical: 1.5,
  important: 1.25,
  ignition: 1.2,
  supporting: 1,
};

function emptyCounts(): RiskCompositionSignalCounts {
  return { green: 0, yellow: 0, orange: 0, red: 0, unavailable: 0 };
}

function highestSignal(signals: Signal[]): Signal {
  return signals.reduce<Signal>(
    (highest, candidate) =>
      signalRank[candidate] > signalRank[highest] ? candidate : highest,
    "unavailable",
  );
}

function weatherLabel(signal: Signal): RiskCompositionCategory["weatherLabel"] {
  if (signal === "red") return "雷";
  if (signal === "orange") return "雨";
  if (signal === "yellow") return "くもり";
  if (signal === "green") return "晴れ";
  return "観測待ち";
}

function geopoliticalSignal(globalRisk?: GlobalRiskData): Signal {
  const levels = globalRisk?.regions.flatMap((region) =>
    region.risks
      .filter((risk) => risk.category === "geopolitical")
      .map((risk) => risk.level),
  ) ?? [];
  if (!levels.length) return "unavailable";
  const average =
    levels.reduce((sum, level) => sum + (signalPoints[level] ?? 0), 0) /
    levels.length;
  if (average >= 2.5) return "red";
  if (average >= 1.5) return "orange";
  if (average >= 0.5) return "yellow";
  return "green";
}

function normalizedIndicatorScore(indicators: RiskCompositionIndicator[]) {
  let weightedPoints = 0;
  let availableWeight = 0;
  for (const indicator of indicators) {
    const points = signalPoints[indicator.signal];
    if (points === null) continue;
    const weight = importanceWeight[indicator.importance];
    weightedPoints += points * weight;
    availableWeight += weight;
  }
  return availableWeight > 0 ? weightedPoints / availableWeight : 0;
}

const automatedMetricConfig: Partial<
  Record<
    AutomatedConditionId,
    {
      name: string;
      importance: Importance;
      unit: string;
      decimals: number;
      threshold: NumericThreshold;
      thresholdDirection?: "higher-is-worse" | "lower-is-worse";
      thresholdLabel: string;
      fredSeries: string[];
    }
  >
> = {
  "sahm-rule": {
    name: "サームルール（暫定）",
    importance: "important",
    unit: "",
    decimals: 2,
    threshold: { yellowAt: 0.3, redAt: 0.5 },
    thresholdLabel: "0.30以上：注意 / 0.50以上：成立。雇用統計改定で変化する暫定値です。",
    fredSeries: ["SAHMREALTIME"],
  },
  "consumer-sentiment": {
    name: "消費者信頼感",
    importance: "supporting",
    unit: "",
    decimals: 1,
    threshold: { yellowAt: 70, redAt: 60 },
    thresholdDirection: "lower-is-worse",
    thresholdLabel: "70未満：注意 / 60未満：強い弱まり。約3カ月の低下幅も判定に使用。",
    fredSeries: ["UMCSENT"],
  },
  "housing-supply": {
    name: "新築住宅供給月数",
    importance: "supporting",
    unit: "カ月",
    decimals: 1,
    threshold: { yellowAt: 7, redAt: 9 },
    thresholdLabel: "7カ月以上：注意 / 9カ月以上：強い在庫圧力",
    fredSeries: ["MSACSR"],
  },
  "term-premium": {
    name: "米10年タームプレミアム",
    importance: "important",
    unit: "%",
    decimals: 2,
    threshold: { yellowAt: 1, redAt: 1.5 },
    thresholdLabel: "1.0%以上：注意 / 1.5%以上：強い長期債保有プレミアム",
    fredSeries: ["THREEFYTP10"],
  },
  "sofr-iorb": {
    name: "SOFR-IORBスプレッド",
    importance: "critical",
    unit: "bp",
    decimals: 0,
    threshold: { yellowAt: 10, redAt: 25 },
    thresholdLabel: "10bp以上：注意 / 25bp以上：強い短期資金圧力",
    fredSeries: ["SOFR", "IORB"],
  },
};

function automatedSignal(condition: AutomatedCondition): Signal {
  if (condition.status === "met") return "red";
  if (condition.status === "watch") return "yellow";
  if (condition.status === "not_met") return "green";
  return "unavailable";
}

function automatedMetric(
  condition: AutomatedCondition,
): RiskCompositionIndicator | null {
  const config = automatedMetricConfig[condition.id];
  if (!config) return null;
  return {
    id: condition.id,
    name: config.name,
    value: condition.numericValue,
    numericValue: condition.numericValue,
    previousNumericValue: condition.history?.[1]?.value ?? null,
    signal: automatedSignal(condition),
    previousSignal: automatedSignal(condition),
    importance: config.importance,
    unit: config.unit,
    decimals: config.decimals,
    threshold: config.threshold,
    thresholdDirection: config.thresholdDirection,
    thresholdLabel: config.thresholdLabel,
    fredSeries: config.fredSeries,
    source: condition.status === "unavailable" ? "unavailable" : "FRED",
    sourceName: condition.sourceName,
    sourceUrl: condition.sourceUrl,
    observationDate: condition.observedAt,
    history: condition.history ?? [],
  };
}

function meterSignal(score: number | null): Signal {
  if (score === null) return "unavailable";
  if (score >= 80) return "red";
  if (score >= 60) return "orange";
  if (score >= 35) return "yellow";
  return "green";
}

function buildRiskMeters(
  byId: Map<IndicatorId, IndicatorValue>,
  automatedById: Map<AutomatedConditionId, AutomatedCondition>,
  geoSignal: Signal,
): RiskMeterItem[] {
  return meterDefinitions.map((definition) => {
    const indicators: RiskCompositionIndicator[] = [
      ...definition.indicatorIds.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      }),
      ...definition.automatedIds.flatMap((id) => {
        const condition = automatedById.get(id);
        const item = condition ? automatedMetric(condition) : null;
        return item ? [item] : [];
      }),
    ];
    const isGeopolitical = definition.id === "geopolitical-other";
    const currentScores = isGeopolitical
      ? [meterSignalScore[geoSignal]].filter((score): score is number => score !== null)
      : indicators.flatMap((indicator) => {
          const score = meterSignalScore[indicator.signal];
          return score === null ? [] : [score];
        });
    const previousScores = isGeopolitical
      ? currentScores
      : indicators.flatMap((indicator) => {
          const score = meterSignalScore[indicator.previousSignal ?? indicator.signal];
          return score === null ? [] : [score];
        });
    const score = currentScores.length
      ? Math.round(currentScores.reduce((sum, value) => sum + value, 0) / currentScores.length)
      : null;
    const previousScore = previousScores.length
      ? previousScores.reduce((sum, value) => sum + value, 0) / previousScores.length
      : null;
    const delta = score !== null && previousScore !== null ? score - previousScore : null;
    const direction: RiskMeterDirection = delta === null
      ? "unavailable"
      : delta >= 3
        ? "worse"
        : delta <= -3
          ? "better"
          : "unchanged";
    const directionLabel = direction === "worse"
      ? "悪化"
      : direction === "better"
        ? "改善"
        : direction === "unchanged"
          ? "変化なし"
          : "比較待ち";
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      componentLabel: definition.componentLabel,
      score,
      signal: meterSignal(score),
      direction,
      directionLabel,
      availableCount: isGeopolitical ? (geoSignal === "unavailable" ? 0 : 1) : currentScores.length,
      totalCount: isGeopolitical ? 1 : definition.indicatorIds.length + definition.automatedIds.length,
      proHref: `/#risk-meter-${definition.id}`,
      indicators,
    };
  });
}

function allocatePercentages(scores: number[]) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  if (total <= 0) return scores.map(() => 0);
  const exact = scores.map((score) => (score / total) * 100);
  const result = exact.map(Math.floor);
  const remainder = 100 - result.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  for (let index = 0; index < remainder; index += 1) {
    result[order[index % order.length].index] += 1;
  }
  return result;
}

function buildSummary(categories: RiskCompositionCategory[], calm: boolean) {
  if (calm) {
    return "いま空を厚く覆う雲は限定的です。各成分の変化を引き続き観測します。";
  }
  const ranked = [...categories].sort(
    (left, right) => right.contribution - left.contribution,
  );
  const top = ranked[0];
  const clear = categories.find(
    (category) => category.signal === "green" && category.contribution === 0,
  );
  return `いまの空を覆う雲の${top.contribution}%は${top.name}です。${
    clear
      ? `${clear.name}は晴れで、雲への寄与はほぼありません。`
      : "複数の成分が重なっているため、内訳を分けて観測します。"
  }`;
}

export function buildRiskComposition(
  indicators: IndicatorValue[],
  globalRisk?: GlobalRiskData,
  generatedAt = new Date().toISOString(),
  automated?: AutomatedConditionsData,
): RiskCompositionModel {
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const automatedById = new Map(
    (automated?.items ?? []).map((condition) => [condition.id, condition]),
  );
  const geoSignal = geopoliticalSignal(globalRisk);

  const base = definitions.map((definition) => {
    const selected = definition.indicatorIds.flatMap((id) => {
      const indicator = byId.get(id);
      return indicator ? [indicator] : [];
    });
    const supplemental = definition.automatedIds.flatMap((id) => {
      const condition = automatedById.get(id);
      if (!condition) return [];
      const metric = automatedMetric(condition);
      return metric ? [metric] : [];
    });
    const categoryIndicators: RiskCompositionIndicator[] = [
      ...selected,
      ...supplemental,
    ];
    const counts = emptyCounts();
    for (const indicator of categoryIndicators) counts[indicator.signal] += 1;

    const isGeopolitical = definition.id === "geopolitical-other";
    if (isGeopolitical) counts[geoSignal] += 1;
    const categorySignal = isGeopolitical
      ? geoSignal
      : highestSignal(categoryIndicators.map((indicator) => indicator.signal));
    const rawScore = isGeopolitical
      ? signalPoints[geoSignal] ?? 0
      : normalizedIndicatorScore(categoryIndicators);

    return {
      ...definition,
      signal: categorySignal,
      weatherLabel: weatherLabel(categorySignal),
      rawScore,
      contribution: 0,
      indicators: categoryIndicators,
      counts,
    } satisfies RiskCompositionCategory;
  });

  const contributions = allocatePercentages(base.map((category) => category.rawScore));
  const categories = base.map((category, index) => ({
    ...category,
    contribution: contributions[index],
  }));
  const totalScore = categories.reduce((sum, category) => sum + category.rawScore, 0);
  const calm = totalScore <= 0;
  const meters = buildRiskMeters(byId, automatedById, geoSignal);

  return {
    generatedAt,
    totalScore,
    calm,
    signal: highestSignal(categories.map((category) => category.signal)),
    summary: buildSummary(categories, calm),
    categories,
    meters,
  };
}
