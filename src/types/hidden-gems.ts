import type { SectorRegion } from "@/types/sector-momentum";

export type HiddenGemComponent = {
  id: string;
  label: string;
  value: number | null;
  score: number | null;
  detail: string;
};

export type HiddenGemItem = {
  ticker: string;
  companyName: string;
  businessSummary: string;
  countryCode: string;
  countryName: string;
  region: SectorRegion;
  exchange: string;
  themes: Array<{
    id: string;
    nameJa: string;
  }>;
  primaryThemeId: string;
  primaryThemeName: string;
  gemScore: number;
  fundamentalScore: number;
  attentionScore: number;
  revenueCagr5y: number;
  revenueGrowthYoY: number | null;
  operatingMargin: number;
  roic: number | null;
  forwardPE: number | null;
  priceToSalesRatio: number | null;
  marketCapUsd: number;
  return3m: number;
  return6m: number | null;
  components: {
    fundamentals: HiddenGemComponent[];
    attention: HiddenGemComponent[];
  };
  reasons: string[];
  sourceName: string;
  updatedAt: string | null;
};

export type HiddenGemExclusionSummary = {
  missingRequiredData: number;
  lowRevenueGrowth: number;
  unprofitable: number;
  tooSmall: number;
  alreadySurged: number;
};

export type HiddenGemsData = {
  generatedAt: string;
  methodologyVersion: string;
  dataSource: "free" | "fmp";
  status: "ready" | "unavailable";
  items: HiddenGemItem[];
  evaluatedCompanies: number;
  eligibleCompanies: number;
  exclusions: HiddenGemExclusionSummary;
  history: HiddenGemHistorySnapshot[];
  disclaimer: string;
  dataNote: string;
  records?: HiddenGemUniverseRecord[];
};

export type HiddenGemUniverseRecord = {
  ticker: string;
  companyName: string;
  status: "available" | "unavailable" | "excluded";
  exclusionReason?: string;
  themes: Array<{
    id: string;
    nameJa: string;
  }>;
  revenueHistory: Array<{
    year: string;
    revenue: number | null;
    operatingIncome: number | null;
    netIncome: number | null;
    eps: number | null;
  }>;
  revenueCagr5y: number | null;
  revenueCagrYears: number | null;
  revenueLatest: number | null;
  netIncomeLatest: number | null;
  revenueGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  epsCagr5y: number | null;
  operatingMargin: number | null;
  operatingMarginChange: number | null;
  grossMargin: number | null;
  roic: number | null;
  roe: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  dividendYield: number | null;
  shareRepurchases: number | null;
  institutionalOwnership: number | null;
  shortInterest: number | null;
  beta: number | null;
  analystCoverage: number | null;
  financialCurrency: string | null;
  marketCapUsd: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
  return3m: number | null;
  return6m: number | null;
  fundamentalScore: number | null;
  attentionScore: number | null;
  gemScore: number | null;
  valuationToThemeMedian?: number | null;
  sourceName: string;
  updatedAt?: string | null;
  error?: string;
};

export type HiddenGemHistoryEntry = {
  ticker: string;
  gemScore: number;
  fundamentalScore: number;
  attentionScore: number;
  price: number | null;
};

export type HiddenGemHistorySnapshot = {
  date: string;
  generatedAt: string;
  methodologyVersion: string;
  entries: HiddenGemHistoryEntry[];
};
