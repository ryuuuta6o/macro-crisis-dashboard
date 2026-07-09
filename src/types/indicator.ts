export type Signal = "green" | "yellow" | "orange" | "red" | "unavailable";
export type OverallSignal =
  | "green"
  | "green-yellow"
  | "yellow"
  | "localized"
  | "red"
  | "crisis"
  | "unavailable";

export type IndicatorCategory =
  | "credit"
  | "rates"
  | "liquidity"
  | "bank-funding"
  | "bank-capital"
  | "household-credit"
  | "credit-supply"
  | "private-markets"
  | "equity-vulnerability"
  | "economy";

export type IndicatorType =
  | "safety_valve"
  | "warning_signal"
  | "vulnerability"
  | "smart_money_signal"
  | "behavior_signal";

export type CoreIndicatorType = Exclude<
  IndicatorType,
  "smart_money_signal" | "behavior_signal"
>;

export type Importance = "critical" | "important" | "ignition" | "supporting";

export type IndicatorId =
  | "hy-oas"
  | "baa-aaa"
  | "ig-oas"
  | "ccc-oas"
  | "vix"
  | "dgs10"
  | "dgs30"
  | "move"
  | "treasury-auction"
  | "sofr"
  | "ted-spread"
  | "fra-ois"
  | "bank-deposit-outflow"
  | "mmf-assets"
  | "discount-window"
  | "btfp"
  | "bank-cet1"
  | "fdic-dif"
  | "household-debt-gdp"
  | "household-dsr"
  | "sloos"
  | "office-cmbs"
  | "cmbs-total"
  | "private-credit-default"
  | "pik-ratio"
  | "leveraged-loan-default"
  | "shiller-cape"
  | "buffett-indicator"
  | "margin-debt-gdp"
  | "margin-debt-m2"
  | "icsa";

export type PlannedIndicatorId =
  | "sahm-rule"
  | "unemployment-rate"
  | "pmi-manufacturing"
  | "pmi-services"
  | "consumer-sentiment"
  | "yield-curve-10y-2y"
  | "fedwatch"
  | "corporate-bankruptcies"
  | "warn-notices"
  | "clo-stress"
  | "ai-capex-roi"
  | "hyperscaler-capex"
  | "fiscal-deficit-gdp"
  | "interest-expense-gdp"
  | "wui";

export type NumericThreshold = {
  yellowAt: number;
  orangeAt?: number;
  redAt: number;
};

export type IndicatorConfig = {
  id: IndicatorId;
  name: string;
  shortName: string;
  type: CoreIndicatorType;
  category: IndicatorCategory;
  importance: Importance;
  unit: string;
  decimals: number;
  description: string;
  beginnerExplanation?: string;
  whyItMatters?: string;
  cautionComment?: string;
  dangerScenario?: string;
  thresholdLabel: string;
  fredSeries: string[];
  mode:
    | "fred"
    | "manual"
    | "spread"
    | "ted-proxy"
    | "fra-ois-proxy"
    | "sofr"
    | "bank-deposits"
    | "mmf"
    | "emergency-lending"
    | "margin-debt-m2"
    | "treasury-auction";
  threshold?: NumericThreshold;
  thresholdDirection?: "higher-is-worse" | "lower-is-worse";
  multiplier?: number;
};

export type IndicatorValue = IndicatorConfig & {
  value: number | string | null;
  previousValue: number | string | null;
  numericValue: number | null;
  previousNumericValue: number | null;
  signal: Signal;
  previousSignal: Signal;
  observationDate: string | null;
  source:
    | "FRED"
    | "treasury"
    | "ny-fed"
    | "fiscal-data"
    | "market-data"
    | "published"
    | "manual"
    | "unavailable";
  sourceLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  updateFrequency?: string;
  history: IndicatorHistoryPoint[];
};

export type ManualIndicator = {
  value: number | string | null;
  previousValue: number | string | null;
  observationDate: string | null;
  signal?: Signal;
  previousSignal?: Signal;
  sourceLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  updateFrequency?: string;
  updatedAt?: string;
  history?: IndicatorHistoryPoint[];
};

export type IndicatorHistoryPoint = {
  date: string;
  value: number;
};

export type DashboardData = {
  indicators: IndicatorValue[];
  fetchedAt: string;
  unavailableCount: number;
};

export type ChangeItem = {
  id: IndicatorId;
  name: string;
  previousLabel: string;
  currentLabel: string;
  changeLabel: string;
  previousSignal: Signal;
  currentSignal: Signal;
  direction: "worsening" | "improving" | "flat";
};

export type MarketNewsItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  impactLevel: "green" | "yellow" | "red";
  impactScore: number;
  impactCategory: string;
  relatedIndicators: string[];
  reason: string;
};

export type MarketNewsFeedMode =
  | "live"
  | "mixed"
  | "official"
  | "fallback";

export type MarketNewsFeed = {
  items: MarketNewsItem[];
  mode: MarketNewsFeedMode;
  fetchedAt: string;
  latestPublishedAt: string | null;
  sourceSummary: string;
  isFallback: boolean;
};

export type SimilarPeriodCondition =
  | "green"
  | "yellow_or_red"
  | "green_or_yellow"
  | "red";

export type SimilarPeriod = {
  id: string;
  label: string;
  conditions: Partial<Record<"vix" | "dgs10" | "hyOas" | "igOas" | "sofr", SimilarPeriodCondition>>;
  summary: string;
  note: string;
};

export type AssetTemperature = {
  label: string;
  signal: Exclude<Signal, "unavailable">;
  comment: string;
};

export type RiskLevel = "green" | "yellow" | "orange" | "red";

export type IndicatorData = {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  previousValue?: number | string;
  change?: number;
  changeLabel?: string;
  level: RiskLevel;
  type: IndicatorType;
  category: string;
  importance: "SSS" | "SS" | "S" | "A" | "B";
  beginnerExplanation: string;
  whyItMatters: string;
  thresholds: {
    green: string;
    yellow: string;
    orange?: string;
    red: string;
  };
  dangerScenario: string;
  relatedIndicators: string[];
  relatedNewsIds?: string[];
  sourceName: string;
  sourceUrl?: string;
  updatedAt: string;
};

export type SafetyValve3DItem = {
  id: IndicatorId;
  name: string;
  value: number | string;
  level: RiskLevel;
  importance: "SSS" | "SS" | "S" | "A" | "B";
  category: string;
  change: number | null;
};

export type ContagionLink = {
  from: IndicatorId;
  to: IndicatorId;
  level: RiskLevel;
};

export type UpdateScheduleCategory =
  | "credit"
  | "liquidity"
  | "rates"
  | "employment"
  | "inflation"
  | "central_bank"
  | "private_markets"
  | "equity_vulnerability"
  | "news"
  | "manual";

export type UpdateScheduleItem = {
  id: string;
  title: string;
  indicatorId?: string;
  category: UpdateScheduleCategory;
  importance: "SSS" | "SS" | "S" | "A" | "B";
  expectedAt: string;
  timezone: "Asia/Tokyo" | "America/New_York" | "UTC";
  displayTimeJa: string;
  updateFrequency:
    | "intraday"
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "manual"
    | "event";
  sourceName: string;
  sourceUrl?: string;
  whyItMatters: string;
  watchLine?: string;
  status: "upcoming" | "updated" | "delayed" | "unavailable";
  relatedIndicators?: string[];
  remainingLabel?: string;
  currentSignal?: Signal;
  observationDate?: string | null;
};

export type NextUpdateWatchData = {
  generatedAt: string;
  nextItems: UpdateScheduleItem[];
};

export type UpdateItem = {
  id: string;
  title: string;
  category:
    | "indicator"
    | "signal_change"
    | "news"
    | "manual_data"
    | "risk_velocity"
    | "system";
  level: "green" | "yellow" | "orange" | "red";
  direction: "worse" | "better" | "unchanged" | "new";
  summary: string;
  before?: string | number;
  after?: string | number;
  previousSignal?: string;
  currentSignal?: string;
  relatedIndicators?: string[];
  sourceName?: string;
  sourceUrl?: string;
  updatedAt: string;
};

export type UpdateRadarData = {
  generatedAt: string;
  summary: {
    totalUpdates: number;
    worsened: number;
    improved: number;
    newNews: number;
    manualUpdates: number;
  };
  highlights: UpdateItem[];
  indicatorUpdates: UpdateItem[];
  newsUpdates: UpdateItem[];
  manualUpdates: UpdateItem[];
};

