import type { RiskLevel } from "@/types/indicator";

export type GlobalRiskCategory =
  | "interest"
  | "credit"
  | "real-estate"
  | "geopolitical"
  | "ai-semiconductor"
  | "liquidity";

export type GlobalRiskMembership =
  | "gdp_top_10"
  | "g7"
  | "regional_focus"
  | "semiconductor";

export type RegionalRiskItem = {
  category: GlobalRiskCategory;
  label: string;
  level: RiskLevel;
  summary: string;
};

export type GlobalRiskDataMode =
  | "live_market"
  | "official_release"
  | "manual_fallback";

export type GlobalMarketPulse = {
  symbol: string;
  label: string;
  value: number;
  previousClose: number;
  changePercent: number;
  currency?: string;
  exchange?: string;
  level: RiskLevel;
  observedAt: string;
  sourceName: string;
  sourceUrl: string;
  mode: GlobalRiskDataMode;
};

export type GlobalRiskRegion = {
  id: string;
  code: string;
  name: string;
  japaneseName: string;
  level: RiskLevel;
  summary: string;
  mapX: number;
  mapY: number;
  memberships: GlobalRiskMembership[];
  gdpRank?: number;
  gdpUsdTrillion?: number;
  risks: RegionalRiskItem[];
  relatedIndicators: string[];
  sourceUrls: string[];
  marketPulse?: GlobalMarketPulse;
};

export type GlobalMoneyFlow = {
  from: string;
  to: string;
  level: RiskLevel;
  summary: string;
};

export type GlobalRiskData = {
  updatedAt: string;
  marketDataUpdatedAt?: string;
  refreshIntervalSeconds?: number;
  liveMarketCount?: number;
  dataStatus?: "live" | "partial" | "fallback";
  gdpReference: {
    label: string;
    year: number;
    sourceName: string;
    sourceUrl: string;
  };
  regions: GlobalRiskRegion[];
  moneyFlows: GlobalMoneyFlow[];
};
