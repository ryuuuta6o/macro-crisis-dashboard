import { manualCompanyFinancials } from "@/config/manual-company-financials";
import { readFreeHiddenGemsSnapshot } from "@/lib/hidden-gems-source";
import type { HiddenGemUniverseRecord } from "@/types/hidden-gems";
import type { SectorCompanyGrowthData } from "@/types/sector-momentum";

export async function getConfiguredCompanyFinancials(symbol: string) {
  if (process.env.DATA_SOURCE?.toLowerCase() === "fmp") {
    const { getCompanyFinancials } = await import("@/lib/company-financials");
    return getCompanyFinancials(symbol);
  }
  const all = await getAllFreeCompanyFinancials();
  return all[symbol] ?? unavailableFreeFinancials();
}

export async function getAllFreeCompanyFinancials() {
  const snapshot = await readFreeHiddenGemsSnapshot();
  const entries = (snapshot.records ?? []).map(
    (record) => [record.ticker, convertRecord(record)] as const,
  );
  return Object.fromEntries(entries) as Record<string, SectorCompanyGrowthData>;
}

function convertRecord(record: HiddenGemUniverseRecord): SectorCompanyGrowthData {
  const manual = manualCompanyFinancials[record.ticker];
  const base: SectorCompanyGrowthData = {
    financialCurrency: record.financialCurrency,
    revenueLatest: record.revenueLatest,
    netIncomeLatest: record.netIncomeLatest,
    revenueGrowthYoY: record.revenueGrowthYoY,
    revenueCagr5y: record.revenueCagr5y,
    epsGrowthYoY: record.epsGrowthYoY,
    epsCagr5y: record.epsCagr5y,
    annualHistory: record.revenueHistory.map((point) => ({
      year: point.year,
      revenue: point.revenue,
      eps: point.eps,
    })),
    orders: null,
    ordersLabel: "無料データ源では受注を取得できません",
    backlog: null,
    backlogLabel: "無料データ源では受注残を取得できません",
    backlogGrowth: null,
    roe: record.roe,
    roic: record.roic,
    operatingMargin: record.operatingMargin,
    operatingMarginChange: record.operatingMarginChange,
    grossMargin: record.grossMargin,
    freeCashFlow: record.freeCashFlow,
    dividendYield: record.dividendYield,
    shareRepurchases: record.shareRepurchases,
    peRatio: record.peRatio,
    priceToSalesRatio: record.priceToSalesRatio,
    debtToEquity: record.debtToEquity,
    analystCoverage: record.analystCoverage,
    institutionalOwnership: record.institutionalOwnership,
    shortInterest: record.shortInterest,
    beta: record.beta,
    fundamentalScore: record.fundamentalScore,
    attentionScore: record.attentionScore,
    gemScore: record.gemScore,
    valuationToThemeMedian: record.valuationToThemeMedian ?? null,
    return3m: record.return3m,
    return6m: record.return6m,
    sourceName: "Yahoo Finance via yfinance daily batch",
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(record.ticker)}`,
    status: record.status === "unavailable" ? "unavailable" : "live",
    updatedAt: record.updatedAt ?? null,
  };
  if (!manual) return base;
  return { ...base, ...manual, status: "manual" };
}

function unavailableFreeFinancials(): SectorCompanyGrowthData {
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
    ordersLabel: "無料データ源では受注を取得できません",
    backlog: null,
    backlogLabel: "無料データ源では受注残を取得できません",
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
    sourceName: "Yahoo Finance daily batch unavailable",
    status: "unavailable",
    updatedAt: null,
  };
}
