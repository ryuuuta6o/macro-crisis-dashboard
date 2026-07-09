import { manualCompanyFinancials } from "@/config/manual-company-financials";
import type {
  AnnualFinancialPoint,
  SectorCompanyGrowthData,
} from "@/types/sector-momentum";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

type FmpIncomeStatement = {
  date?: string;
  calendarYear?: string;
  revenue?: number;
  eps?: number;
  operatingIncomeRatio?: number;
  netIncome?: number;
  grossProfitRatio?: number;
};

type FmpCashFlowStatement = {
  date?: string;
  freeCashFlow?: number;
  commonStockRepurchased?: number;
};

type FmpKeyMetrics = {
  roeTTM?: number;
  roicTTM?: number;
  dividendYieldTTM?: number;
};

type FmpRatios = {
  returnOnEquityTTM?: number;
  returnOnCapitalEmployedTTM?: number;
  operatingProfitMarginTTM?: number;
  dividendYieldTTM?: number;
  priceEarningsRatioTTM?: number;
  priceToSalesRatioTTM?: number;
  debtEquityRatioTTM?: number;
};

type FmpProfile = {
  beta?: number;
  currency?: string;
};

export async function getCompanyFinancials(
  symbol: string,
): Promise<SectorCompanyGrowthData> {
  const manual = manualCompanyFinancials[symbol];
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return applyManual(unavailableFinancials(), manual);

  const encodedSymbol = encodeURIComponent(symbol);
  const encodedKey = encodeURIComponent(apiKey);
  const [income, cashFlow, metrics, ratios, profile] = await Promise.all([
    fetchFmp<FmpIncomeStatement[]>(
      `${FMP_BASE_URL}/income-statement/${encodedSymbol}?period=annual&limit=5&apikey=${encodedKey}`,
    ),
    fetchFmp<FmpCashFlowStatement[]>(
      `${FMP_BASE_URL}/cash-flow-statement/${encodedSymbol}?period=annual&limit=5&apikey=${encodedKey}`,
    ),
    fetchFmp<FmpKeyMetrics[]>(
      `${FMP_BASE_URL}/key-metrics-ttm/${encodedSymbol}?apikey=${encodedKey}`,
    ),
    fetchFmp<FmpRatios[]>(
      `${FMP_BASE_URL}/ratios-ttm/${encodedSymbol}?apikey=${encodedKey}`,
    ),
    fetchFmp<FmpProfile[]>(
      `${FMP_BASE_URL}/profile/${encodedSymbol}?apikey=${encodedKey}`,
    ),
  ]);

  const statements = Array.isArray(income) ? income : [];
  const cash = Array.isArray(cashFlow) ? cashFlow : [];
  const annualHistory = statements
    .map<AnnualFinancialPoint>((statement) => ({
      year: statement.calendarYear ?? statement.date?.slice(0, 4) ?? "N/A",
      revenue: finite(statement.revenue),
      eps: finite(statement.eps),
    }))
    .reverse();
  const latest = statements[0];
  const previous = statements[1];
  const oldest = statements.at(-1);
  const latestCash = cash[0];
  const keyMetrics = Array.isArray(metrics) ? metrics[0] : undefined;
  const ratio = Array.isArray(ratios) ? ratios[0] : undefined;
  const companyProfile = Array.isArray(profile) ? profile[0] : undefined;
  const hasFmpData =
    statements.length > 0 ||
    cash.length > 0 ||
    Boolean(keyMetrics || ratio || companyProfile);

  const result: SectorCompanyGrowthData = {
    financialCurrency: companyProfile?.currency ?? null,
    revenueLatest: finite(latest?.revenue),
    netIncomeLatest: finite(latest?.netIncome),
    revenueGrowthYoY: percentChange(latest?.revenue, previous?.revenue),
    revenueCagr5y: cagr(latest?.revenue, oldest?.revenue, Math.max(1, statements.length - 1)),
    epsGrowthYoY: percentChange(latest?.eps, previous?.eps),
    epsCagr5y: cagr(latest?.eps, oldest?.eps, Math.max(1, statements.length - 1)),
    annualHistory,
    orders: null,
    ordersLabel: "受注データなし",
    backlog: null,
    backlogLabel: "受注残データなし",
    backlogGrowth: null,
    roe: ratioPercent(keyMetrics?.roeTTM ?? ratio?.returnOnEquityTTM),
    roic: ratioPercent(keyMetrics?.roicTTM ?? ratio?.returnOnCapitalEmployedTTM),
    operatingMargin: ratioPercent(
      ratio?.operatingProfitMarginTTM ?? latest?.operatingIncomeRatio,
    ),
    operatingMarginChange: percentagePointChange(
      latest?.operatingIncomeRatio,
      previous?.operatingIncomeRatio,
    ),
    grossMargin: ratioPercent(latest?.grossProfitRatio),
    freeCashFlow: finite(latestCash?.freeCashFlow),
    dividendYield: ratioPercent(
      keyMetrics?.dividendYieldTTM ?? ratio?.dividendYieldTTM,
    ),
    shareRepurchases: finite(latestCash?.commonStockRepurchased),
    peRatio: finite(ratio?.priceEarningsRatioTTM),
    priceToSalesRatio: finite(ratio?.priceToSalesRatioTTM),
    debtToEquity: finite(ratio?.debtEquityRatioTTM),
    analystCoverage: null,
    institutionalOwnership: null,
    shortInterest: null,
    beta: finite(companyProfile?.beta),
    fundamentalScore: null,
    attentionScore: null,
    gemScore: null,
    valuationToThemeMedian: null,
    return3m: null,
    return6m: null,
    sourceName: hasFmpData ? "Financial Modeling Prep" : "Unavailable",
    sourceUrl: hasFmpData
      ? `https://financialmodelingprep.com/financial-summary/${encodeURIComponent(symbol)}`
      : undefined,
    status: hasFmpData ? "live" : "unavailable",
    updatedAt: latest?.date ?? latestCash?.date ?? null,
  };

  return applyManual(result, manual);
}

async function fetchFmp<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function unavailableFinancials(): SectorCompanyGrowthData {
  return {
    financialCurrency: null,
    revenueLatest: null,
    netIncomeLatest: null,
    revenueGrowthYoY: null,
    revenueCagr5y: null,
    epsGrowthYoY: null,
    epsCagr5y: null,
    annualHistory: [],
    orders: null,
    ordersLabel: "受注データなし",
    backlog: null,
    backlogLabel: "受注残データなし",
    backlogGrowth: null,
    roe: null,
    roic: null,
    operatingMargin: null,
    operatingMarginChange: null,
    grossMargin: null,
    freeCashFlow: null,
    dividendYield: null,
    shareRepurchases: null,
    peRatio: null,
    priceToSalesRatio: null,
    debtToEquity: null,
    analystCoverage: null,
    institutionalOwnership: null,
    shortInterest: null,
    beta: null,
    fundamentalScore: null,
    attentionScore: null,
    gemScore: null,
    valuationToThemeMedian: null,
    return3m: null,
    return6m: null,
    sourceName: "Unavailable",
    status: "unavailable",
    updatedAt: null,
  };
}

function applyManual(
  base: SectorCompanyGrowthData,
  manual: (typeof manualCompanyFinancials)[string] | undefined,
) {
  if (!manual) return base;
  return {
    ...base,
    ...manual,
    status: "manual" as const,
  };
}

function finite(value: number | undefined) {
  return Number.isFinite(value) ? (value as number) : null;
}

function percentChange(current: number | undefined, previous: number | undefined) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return (((current as number) - (previous as number)) / Math.abs(previous as number)) * 100;
}

function cagr(current: number | undefined, oldest: number | undefined, years: number) {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(oldest) ||
    (current as number) <= 0 ||
    (oldest as number) <= 0 ||
    years <= 0
  ) {
    return null;
  }
  return (Math.pow((current as number) / (oldest as number), 1 / years) - 1) * 100;
}

function ratioPercent(value: number | undefined) {
  if (!Number.isFinite(value)) return null;
  const numeric = value as number;
  return Math.abs(numeric) <= 2 ? numeric * 100 : numeric;
}

function percentagePointChange(
  current: number | undefined,
  previous: number | undefined,
) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return ratioPercent(current)! - ratioPercent(previous)!;
}
