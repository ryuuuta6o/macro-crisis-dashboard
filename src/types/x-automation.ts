import type { IndicatorValue, MarketNewsItem } from "@/types/indicator";

export type PostingSlot = "morning" | "midday" | "evening";
export type GenerationTopic =
  | "all"
  | "stock_market"
  | "influential_people"
  | "credit_rates"
  | "economy_policy"
  | "fx_commodities_crypto"
  | "japan_asia"
  | "social_trends";
export type GenerationCriteria = {
  allowRoutineSnapshot: boolean;
  requireMarketAnomaly: boolean;
  requireSocialBuzz: boolean;
  includeContextIndicators: boolean;
  requireTwoSources: boolean;
};
export type CandidateCategory =
  | "market_anomaly"
  | "investor_signal"
  | "economic_news"
  | "trend";
export type SourceKind = "primary" | "official" | "market_data" | "news";
export type RunStatus =
  | "generated"
  | "posted"
  | "skipped"
  | "failed";

export type AutomationSource = {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  publishedAt: string;
  fetchedAt: string;
};

export type MarketSnapshot = {
  id: string;
  name: string;
  ticker: string;
  value: number;
  previousClose: number;
  changePercent: number;
  shortChangePercent: number | null;
  zScore20: number | null;
  observedAt: string;
  sourceUrl: string;
  history: number[];
};

export type AutomationInput = {
  collectedAt: string;
  indicators: IndicatorValue[];
  markets: MarketSnapshot[];
  news: MarketNewsItem[];
  newsMode: string;
  investorSignals: InvestorSignal[];
  socialTrends: SocialTrendSignal[];
  socialMode: "google_trends" | "news_density" | "x_api" | "mixed" | "unavailable";
};

export type SocialTrendSignal = {
  id: string;
  topic: string;
  trafficLabel: string;
  trafficEstimate: number;
  publishedAt: string;
  category: string;
  score: number;
  summary: string;
  headlines: string[];
  relatedIndicators: string[];
  sources: AutomationSource[];
};

export type InvestorSignal = {
  id: string;
  person: string;
  title: string;
  summary: string;
  filingDate: string;
  score: number;
  source: AutomationSource;
};

export type ScoreBreakdown = {
  importance: number;
  freshness: number;
  topicVelocity: number;
  japanRelevance: number;
  spillover: number;
  surprise: number;
  forwardInterest: number;
  categoryBonus: number;
  penalties: number;
  total: number;
};

export type PostCandidate = {
  id: string;
  themeKey: string;
  title: string;
  category: CandidateCategory;
  summary: string;
  facts: string[];
  watchNext: string;
  sourceIds: string[];
  sources: AutomationSource[];
  relatedIndicators: string[];
  anomalyScore: number;
  investorScore: number;
  viral: ScoreBreakdown;
  publishedAt: string;
};

export type WriterCandidate = {
  text: string;
  hook_type: string;
  angle: string;
  facts_used: string[];
  source_ids: string[];
};

export type FactCheckResult = {
  passed: boolean;
  risk_score: number;
  issues: string[];
  corrected_text: string;
  verified_source_ids: string[];
};

export type EditorialResult = {
  selected_index: number;
  final_text: string;
  selection_reason: string;
  viral_score: number;
  risk_score: number;
};

export type AutomationSettings = {
  autoPostEnabled: boolean;
  dryRun: boolean;
  includeSiteUrl: boolean;
  requireTwoSources: boolean;
  schedules: Record<PostingSlot, string>;
  thresholds: {
    equityDailyPercent: number;
    equityShortPercent: number;
    vixDailyPercent: number;
    yieldBasisPoints: number;
    usdJpyAbsolute: number;
    commodityDailyPercent: number;
    cryptoDailyPercent: number;
    zScore: number;
  };
};

export type AutomationRun = {
  id: string;
  idempotencyKey: string;
  slot: PostingSlot;
  generationTopic?: GenerationTopic;
  generationCriteria?: GenerationCriteria;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  status: RunStatus;
  dryRun: boolean;
  generationMode?: "ai" | "template_fallback";
  warning?: string | null;
  candidates: PostCandidate[];
  drafts: WriterCandidate[];
  factChecks: FactCheckResult[];
  editorial: EditorialResult | null;
  finalText: string | null;
  themeKey: string | null;
  sources: AutomationSource[];
  postId: string | null;
  error: string | null;
  metrics: PostMetrics | null;
};

export type PostMetrics = {
  impressions?: number;
  likes?: number;
  reposts?: number;
  profileVisits?: number;
  siteVisits?: number;
};

export type AutomationState = {
  settings: AutomationSettings;
  runs: AutomationRun[];
  updatedAt: string;
};

export type EnvironmentStatus = {
  xCredentials: boolean;
  llm: boolean;
  cronSecret: boolean;
  adminSecret: boolean;
  persistentStorage: boolean;
};

