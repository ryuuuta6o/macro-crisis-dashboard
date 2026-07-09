export type SectorMomentumPeriod =
  | "1d"
  | "1w"
  | "1m"
  | "3m"
  | "ytd"
  | "1y"
  | "3y"
  | "5y";

export type SectorMomentumLevel = "high" | "medium" | "low" | "unavailable";

export type SectorMomentumTheme =
  | "gics"
  | "quantum-computing"
  | "space-economy"
  | "ai-semiconductors"
  | "ai-software"
  | "ai-infrastructure"
  | "data-center"
  | "power-nuclear"
  | "fusion"
  | "robotics-humanoid"
  | "autonomous-driving"
  | "cybersecurity"
  | "defense"
  | "biotech-genomics"
  | "glp1-obesity"
  | "battery-storage"
  | "rare-earth-critical-minerals"
  | "blockchain-crypto"
  | "hbm-semicap"
  | "ai-data-center-buildout"
  | "ai-power-nuclear-picks"
  | "robotics-components"
  | "space-infrastructure"
  | "ev-battery-supply-chain"
  | "drug-discovery-cdmo"
  | "defense-electronics"
  | "ai-software-security"
  | "crypto-infrastructure";

export type SectorDisplayMode = "sector" | "theme";

export type SectorRegion =
  | "us"
  | "japan"
  | "korea"
  | "taiwan"
  | "china"
  | "hong-kong"
  | "europe"
  | "india"
  | "other";

export type SectorCompanyFundamentals = {
  revenueGrowthYoY: number | null;
  netIncome: number | null;
  epsGrowthYoY: number | null;
  forwardPE: number | null;
  forwardRevenueGrowth: number | null;
  grossMargin: number | null;
  earningsSurprise: "beat" | "miss" | "inline" | "unavailable";
  nextEarningsDate: string | null;
};

export type AnnualFinancialPoint = {
  year: string;
  revenue: number | null;
  eps: number | null;
};

export type SectorCompanyGrowthData = {
  financialCurrency: string | null;
  revenueLatest: number | null;
  netIncomeLatest: number | null;
  revenueGrowthYoY: number | null;
  revenueCagr5y: number | null;
  epsGrowthYoY: number | null;
  epsCagr5y: number | null;
  annualHistory: AnnualFinancialPoint[];
  orders: number | null;
  ordersLabel: string;
  backlog: number | null;
  backlogLabel: string;
  backlogGrowth: number | null;
  roe: number | null;
  roic: number | null;
  operatingMargin: number | null;
  operatingMarginChange: number | null;
  grossMargin: number | null;
  freeCashFlow: number | null;
  dividendYield: number | null;
  shareRepurchases: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
  debtToEquity: number | null;
  analystCoverage: number | null;
  institutionalOwnership: number | null;
  shortInterest: number | null;
  beta: number | null;
  fundamentalScore: number | null;
  attentionScore: number | null;
  gemScore: number | null;
  valuationToThemeMedian: number | null;
  return3m: number | null;
  return6m: number | null;
  sourceName: string;
  sourceUrl?: string;
  status: "live" | "manual" | "unavailable";
  updatedAt: string | null;
};

export type SectorExpectationInputs = {
  socialSearchGrowth: number | null;
  analystRevision: number | null;
  relativeMomentum: number | null;
  fundFlow: number | null;
  trendingKeywords: string[];
  sourceNote: string;
};

export type SectorCompanyConfig = {
  ticker: string;
  name: string;
  countryCode: string;
  countryName: string;
  region: SectorRegion;
  exchange: string;
  businessSummary: string;
  subcategory?: string;
  marketCapUsd: number | null;
  fundamentals: SectorCompanyFundamentals;
  expectation: SectorExpectationInputs;
};

export type SectorDefinition = {
  id: string;
  name: string;
  nameJa: string;
  displayMode: SectorDisplayMode;
  theme: SectorMomentumTheme;
  benchmarkSymbol: string;
  marketCapUsd: number | null;
  keywords: string[];
  structureDescription?: string;
  themeFamily?: "growth" | "pickaxe";
  companies: SectorCompanyConfig[];
};

export type ReturnMap = Record<SectorMomentumPeriod, number | null>;

export type RangePosition = {
  week52: number | null;
  fiveYearHighDistance: number | null;
};

export type SectorMarketSeries = {
  symbol: string;
  price: number | null;
  currency: string | null;
  observedAt: string | null;
  returns: ReturnMap;
  rangePosition: RangePosition;
  history: Array<{
    date: string;
    value: number;
  }>;
  sourceName: string;
  sourceUrl: string;
  status: "live" | "unavailable";
};

export type SectorCompanyData = SectorCompanyConfig & {
  market: SectorMarketSeries;
  expectationScore: number | null;
  expectationLevel: SectorMomentumLevel;
  profileSource: "fmp" | "manual" | "unavailable";
};

export type SectorMomentumDataItem = Omit<SectorDefinition, "companies"> & {
  market: SectorMarketSeries;
  companies: SectorCompanyData[];
  momentumScore: number | null;
  expectationScore: number | null;
  expectationLevel: SectorMomentumLevel;
  relativeStrength: number | null;
  shortTermAverageReturn3m: number | null;
  isOverheated: boolean;
};

export type SectorMomentumData = {
  generatedAt: string;
  benchmark: SectorMarketSeries;
  sectors: SectorMomentumDataItem[];
  availableRegions: Array<{
    id: SectorRegion;
    label: string;
  }>;
  scoreWeights: {
    socialSearchGrowth: number;
    analystRevision: number;
    relativeMomentum: number;
    fundFlow: number;
  };
  disclaimer: string;
};
