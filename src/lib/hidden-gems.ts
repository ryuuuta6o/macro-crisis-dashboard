import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCompanyFinancials } from "@/lib/company-financials";
import { getSectorMomentumData } from "@/lib/sector-momentum";
import type {
  HiddenGemComponent,
  HiddenGemHistorySnapshot,
  HiddenGemItem,
  HiddenGemsData,
} from "@/types/hidden-gems";
import type {
  SectorCompanyData,
  SectorCompanyGrowthData,
  SectorMomentumDataItem,
} from "@/types/sector-momentum";

const METHODOLOGY_VERSION = "hidden-gems-v1";
const MIN_MARKET_CAP = 100_000_000;
const MIN_REVENUE_CAGR = 10;
const MAX_THREE_MONTH_RETURN = 50;

type Candidate = {
  company: SectorCompanyData;
  themes: SectorMomentumDataItem[];
  financials: SectorCompanyGrowthData;
};

export async function getHiddenGemsData(): Promise<HiddenGemsData> {
  const momentum = await getSectorMomentumData();
  const themeSectors = momentum.sectors.filter(
    (sector) => sector.displayMode === "theme",
  );
  const companyMap = collectThemeCompanies(themeSectors);
  const prefiltered = Array.from(companyMap.values()).filter(({ company }) => {
    const marketCap = company.marketCapUsd;
    const return3m = company.market.returns["3m"];
    return (
      marketCap !== null &&
      marketCap >= MIN_MARKET_CAP &&
      return3m !== null &&
      return3m < MAX_THREE_MONTH_RETURN
    );
  });
  const financialEntries = await mapWithConcurrency(
    prefiltered,
    5,
    async ({ company }) =>
      [company.ticker, await getCompanyFinancials(company.ticker)] as const,
  );
  const financialMap = new Map(financialEntries);
  const candidates: Candidate[] = Array.from(companyMap.values()).map(
    ({ company, themes }) => ({
      company,
      themes,
      financials:
        financialMap.get(company.ticker) ?? unavailableFinancials(),
    }),
  );
  const medians = buildThemeValuationMedians(candidates);
  const exclusions = {
    missingRequiredData: 0,
    lowRevenueGrowth: 0,
    unprofitable: 0,
    tooSmall: 0,
    alreadySurged: 0,
  };
  const items: HiddenGemItem[] = [];

  for (const candidate of candidates) {
    const { company, financials } = candidate;
    const marketCap = company.marketCapUsd;
    const return3m = company.market.returns["3m"];
    if (
      financials.revenueCagr5y === null ||
      financials.operatingMargin === null ||
      marketCap === null ||
      return3m === null
    ) {
      exclusions.missingRequiredData += 1;
      continue;
    }
    if (financials.revenueCagr5y < MIN_REVENUE_CAGR) {
      exclusions.lowRevenueGrowth += 1;
      continue;
    }
    if (financials.operatingMargin <= 0) {
      exclusions.unprofitable += 1;
      continue;
    }
    if (marketCap < MIN_MARKET_CAP) {
      exclusions.tooSmall += 1;
      continue;
    }
    if (return3m >= MAX_THREE_MONTH_RETURN) {
      exclusions.alreadySurged += 1;
      continue;
    }

    items.push(scoreCandidate(candidate, medians));
  }

  items.sort((a, b) => b.gemScore - a.gemScore);
  const hasLiveFinancials = candidates.some(
    (candidate) => candidate.financials.status !== "unavailable",
  );

  return {
    generatedAt: new Date().toISOString(),
    methodologyVersion: METHODOLOGY_VERSION,
    dataSource: "fmp",
    status: hasLiveFinancials ? "ready" : "unavailable",
    items,
    evaluatedCompanies: candidates.length,
    eligibleCompanies: items.length,
    exclusions,
    history: await readHistory(),
    disclaimer:
      "これは状態の可視化であり、推奨ではありません。注目が低いことには、構造変化やガバナンス問題などの理由がある場合もあります。Gem Scoreは実態と注目の乖離であり、価格上昇の予測ではありません。",
    dataNote: hasLiveFinancials
      ? "FMP財務データと市場価格を使い、日次キャッシュ単位で再計算しています。欠損した必須項目は推測せず除外します。"
      : "FMP_API_KEYが未設定または財務データを取得できないため、判定可能な銘柄はありません。",
  };
}

function collectThemeCompanies(themes: SectorMomentumDataItem[]) {
  const companyMap = new Map<
    string,
    { company: SectorCompanyData; themes: SectorMomentumDataItem[] }
  >();
  for (const theme of themes) {
    for (const company of theme.companies) {
      const existing = companyMap.get(company.ticker);
      if (existing) {
        existing.themes.push(theme);
      } else {
        companyMap.set(company.ticker, { company, themes: [theme] });
      }
    }
  }
  return companyMap;
}

function scoreCandidate(
  candidate: Candidate,
  medians: Map<string, { pe: number | null; ps: number | null }>,
): HiddenGemItem {
  const { company, financials, themes } = candidate;
  const primaryTheme = themes[0];
  const themeMedian = medians.get(primaryTheme.id) ?? { pe: null, ps: null };
  const fundamentalComponents = buildFundamentalComponents(financials);
  const attentionComponents = buildAttentionComponents(
    company,
    financials,
    themeMedian,
  );
  const fundamentalScore = weightedScore(fundamentalComponents);
  const attentionScore = weightedScore(attentionComponents);
  const gemScore = Math.round(fundamentalScore - attentionScore);
  const valuationRatio = relativeValuationRatio(financials, themeMedian);

  const reasons = [
    `売上5年CAGR ${formatPercent(financials.revenueCagr5y)}`,
    financials.revenueGrowthYoY !== null &&
    financials.revenueGrowthYoY > financials.revenueCagr5y!
      ? `直近売上成長 ${formatPercent(financials.revenueGrowthYoY)}で加速`
      : null,
    `営業利益率 ${formatPercent(financials.operatingMargin)}`,
    financials.roic !== null
      ? `ROIC ${formatPercent(financials.roic)}`
      : null,
    valuationRatio !== null
      ? `評価倍率はテーマ中央値の${valuationRatio.toFixed(2)}倍`
      : null,
    financials.analystCoverage !== null
      ? `アナリストカバー ${financials.analystCoverage}社`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ticker: company.ticker,
    companyName: company.name,
    businessSummary: company.businessSummary,
    countryCode: company.countryCode,
    countryName: company.countryName,
    region: company.region,
    exchange: company.exchange,
    themes: themes.map((theme) => ({ id: theme.id, nameJa: theme.nameJa })),
    primaryThemeId: primaryTheme.id,
    primaryThemeName: primaryTheme.nameJa,
    gemScore,
    fundamentalScore,
    attentionScore,
    revenueCagr5y: financials.revenueCagr5y!,
    revenueGrowthYoY: financials.revenueGrowthYoY,
    operatingMargin: financials.operatingMargin!,
    roic: financials.roic,
    forwardPE: financials.peRatio,
    priceToSalesRatio: financials.priceToSalesRatio,
    marketCapUsd: company.marketCapUsd!,
    return3m: company.market.returns["3m"]!,
    return6m: returnForMonths(company, 6),
    components: {
      fundamentals: fundamentalComponents,
      attention: attentionComponents,
    },
    reasons,
    sourceName: financials.sourceName,
    updatedAt: financials.updatedAt,
  };
}

function buildFundamentalComponents(
  financials: SectorCompanyGrowthData,
): HiddenGemComponent[] {
  const acceleration =
    financials.revenueGrowthYoY !== null &&
    financials.revenueCagr5y !== null
      ? financials.revenueGrowthYoY - financials.revenueCagr5y
      : null;
  const marginScore =
    financials.operatingMargin === null
      ? null
      : clamp((financials.operatingMargin / 30) * 100, 0, 100);
  const marginImprovementScore =
    financials.operatingMarginChange === null
      ? null
      : clamp(50 + financials.operatingMarginChange * 8, 0, 100);
  const combinedMargin =
    marginScore === null
      ? null
      : marginImprovementScore === null
        ? marginScore
        : marginScore * 0.7 + marginImprovementScore * 0.3;

  return [
    component(
      "revenue-cagr",
      "売上5年CAGR",
      financials.revenueCagr5y,
      financials.revenueCagr5y === null
        ? null
        : clamp(((financials.revenueCagr5y - 10) / 20) * 100, 0, 100),
      0.25,
      financials.revenueCagr5y === null
        ? "データなし"
        : `${formatPercent(financials.revenueCagr5y)}。15%超を高成長域として評価します。`,
    ),
    component(
      "growth-acceleration",
      "売上成長の加速",
      acceleration,
      acceleration === null ? null : clamp(50 + acceleration * 4, 0, 100),
      0.15,
      acceleration === null
        ? "比較データなし"
        : `直近成長率と5年CAGRの差は${formatPercent(acceleration)}です。`,
    ),
    component(
      "operating-margin",
      "営業利益率",
      financials.operatingMargin,
      combinedMargin,
      0.2,
      financials.operatingMargin === null
        ? "データなし"
        : `営業利益率${formatPercent(financials.operatingMargin)}、前年差${formatPercent(financials.operatingMarginChange)}です。`,
    ),
    component(
      "roic",
      "ROIC",
      financials.roic,
      financials.roic === null
        ? null
        : clamp((financials.roic / 25) * 100, 0, 100),
      0.2,
      financials.roic === null
        ? "データなし"
        : `投下資本利益率は${formatPercent(financials.roic)}です。`,
    ),
    component(
      "backlog",
      "受注残の伸び",
      financials.backlogGrowth,
      financials.backlogGrowth === null
        ? null
        : clamp((financials.backlogGrowth / 30) * 100, 0, 100),
      0.1,
      financials.backlogGrowth === null
        ? "標準化された受注残データなし"
        : `受注残の伸びは${formatPercent(financials.backlogGrowth)}です。`,
    ),
    component(
      "balance-sheet",
      "財務健全性",
      financials.debtToEquity,
      financials.debtToEquity === null
        ? null
        : clamp(100 - financials.debtToEquity * 40, 0, 100),
      0.1,
      financials.debtToEquity === null
        ? "債務比率データなし"
        : `Debt/Equityは${financials.debtToEquity.toFixed(2)}です。`,
    ),
  ];
}

function buildAttentionComponents(
  company: SectorCompanyData,
  financials: SectorCompanyGrowthData,
  median: { pe: number | null; ps: number | null },
): HiddenGemComponent[] {
  const valuationRatio = relativeValuationRatio(financials, median);
  const return6m = returnForMonths(company, 6);
  const momentumValues = [company.market.returns["3m"], return6m].filter(
    (value): value is number => value !== null,
  );
  const momentum =
    momentumValues.length === 0
      ? null
      : momentumValues.reduce((sum, value) => sum + value, 0) /
        momentumValues.length;

  return [
    component(
      "valuation",
      "相対バリュエーション",
      valuationRatio,
      valuationRatio === null
        ? null
        : clamp(valuationRatio * 50, 0, 100),
      0.3,
      valuationRatio === null
        ? "比較可能なPER/PSRなし"
        : `テーマ内中央値に対して${valuationRatio.toFixed(2)}倍です。`,
    ),
    component(
      "price-momentum",
      "株価モメンタム",
      momentum,
      momentum === null
        ? null
        : clamp(((momentum + 20) / 70) * 100, 0, 100),
      0.3,
      momentum === null
        ? "価格履歴なし"
        : `3ヶ月${formatPercent(company.market.returns["3m"])}、6ヶ月${formatPercent(return6m)}です。`,
    ),
    component(
      "analyst-coverage",
      "アナリストカバレッジ",
      financials.analystCoverage,
      financials.analystCoverage === null
        ? null
        : clamp((financials.analystCoverage / 20) * 100, 0, 100),
      0.2,
      financials.analystCoverage === null
        ? "カバレッジ数データなし"
        : `${financials.analystCoverage}社がカバーしています。`,
    ),
    component(
      "market-cap",
      "時価総額",
      company.marketCapUsd,
      company.marketCapUsd === null
        ? null
        : clamp(
            (Math.log10(company.marketCapUsd / MIN_MARKET_CAP) / 4) * 100,
            0,
            100,
          ),
      0.2,
      company.marketCapUsd === null
        ? "時価総額データなし"
        : `時価総額は${formatMarketCap(company.marketCapUsd)}です。`,
    ),
  ];
}

function component(
  id: string,
  label: string,
  value: number | null,
  score: number | null,
  weight: number,
  detail: string,
): HiddenGemComponent & { weight: number } {
  return { id, label, value, score, detail, weight };
}

function weightedScore(
  components: Array<HiddenGemComponent & { weight?: number }>,
) {
  const available = components.filter(
    (item): item is HiddenGemComponent & { score: number; weight: number } =>
      item.score !== null && typeof item.weight === "number",
  );
  if (available.length === 0) return 0;
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  return Math.round(
    available.reduce((sum, item) => sum + item.score * item.weight, 0) /
      totalWeight,
  );
}

function buildThemeValuationMedians(candidates: Candidate[]) {
  const values = new Map<string, { pe: number[]; ps: number[] }>();
  for (const candidate of candidates) {
    for (const theme of candidate.themes) {
      const bucket = values.get(theme.id) ?? { pe: [], ps: [] };
      if (
        candidate.financials.peRatio !== null &&
        candidate.financials.peRatio > 0
      ) {
        bucket.pe.push(candidate.financials.peRatio);
      }
      if (
        candidate.financials.priceToSalesRatio !== null &&
        candidate.financials.priceToSalesRatio > 0
      ) {
        bucket.ps.push(candidate.financials.priceToSalesRatio);
      }
      values.set(theme.id, bucket);
    }
  }
  return new Map(
    Array.from(values.entries()).map(([id, bucket]) => [
      id,
      { pe: median(bucket.pe), ps: median(bucket.ps) },
    ]),
  );
}

function relativeValuationRatio(
  financials: SectorCompanyGrowthData,
  medianValues: { pe: number | null; ps: number | null },
) {
  if (
    financials.peRatio !== null &&
    financials.peRatio > 0 &&
    medianValues.pe !== null &&
    medianValues.pe > 0
  ) {
    return financials.peRatio / medianValues.pe;
  }
  if (
    financials.priceToSalesRatio !== null &&
    financials.priceToSalesRatio > 0 &&
    medianValues.ps !== null &&
    medianValues.ps > 0
  ) {
    return financials.priceToSalesRatio / medianValues.ps;
  }
  return null;
}

function returnForMonths(company: SectorCompanyData, months: number) {
  const history = company.market.history;
  const latest = history.at(-1)?.value;
  const prior = history.at(-(Math.round(months * 21) + 1))?.value;
  if (!latest || !prior) return null;
  return ((latest - prior) / prior) * 100;
}

async function readHistory(): Promise<HiddenGemHistorySnapshot[]> {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "hidden-gems-history.json",
    );
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as HiddenGemHistorySnapshot[];
    return Array.isArray(parsed) ? parsed.slice(-90) : [];
  } catch {
    return [];
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatPercent(value: number | null) {
  if (value === null) return "unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return `$${(value / 1_000_000).toFixed(0)}M`;
}
