import { sectorDefinitions, SECTOR_SCORE_WEIGHTS } from "@/config/sector-momentum";
import { thematicDefinitions } from "@/config/themes";
import { companyBusinessNotes } from "@/config/company-notes";
import { readFreeHiddenGemsSnapshot } from "@/lib/hidden-gems-source";
import type { HiddenGemUniverseRecord } from "@/types/hidden-gems";
import type {
  ReturnMap,
  SectorCompanyConfig,
  SectorCompanyData,
  SectorMarketSeries,
  SectorMomentumData,
  SectorMomentumDataItem,
  SectorMomentumLevel,
  SectorMomentumPeriod,
  SectorRegion,
} from "@/types/sector-momentum";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const periods: SectorMomentumPeriod[] = ["1d", "1w", "1m", "3m", "ytd", "1y", "3y", "5y"];

const regionLabels: Record<SectorRegion, string> = {
  us: "米国",
  japan: "日本",
  korea: "韓国",
  taiwan: "台湾",
  china: "中国本土",
  "hong-kong": "香港",
  europe: "欧州",
  india: "インド",
  other: "その他",
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
        adjclose?: Array<{
          adjclose?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type PricePoint = {
  date: Date;
  close: number;
};

type FmpProfile = {
  symbol?: string;
  companyName?: string;
  price?: number;
  mktCap?: number;
  currency?: string;
  exchangeShortName?: string;
  country?: string;
  industry?: string;
  sector?: string;
  description?: string;
};

const unavailableReturns = Object.fromEntries(
  periods.map((period) => [period, null]),
) as ReturnMap;

export async function getSectorMomentumData(): Promise<SectorMomentumData> {
  const benchmark = await fetchMarketSeries("SPY");
  const definitions = [...sectorDefinitions, ...thematicDefinitions];
  const sectorSymbols = definitions.map((sector) => sector.benchmarkSymbol);
  const companySymbols = Array.from(
    new Set(definitions.flatMap((sector) => sector.companies.map((company) => company.ticker))),
  );
  const symbols = Array.from(new Set([...sectorSymbols, ...companySymbols]));
  const [marketEntries, profileEntries, financialSnapshot] = await Promise.all([
    Promise.all(symbols.map(async (symbol) => [symbol, await fetchMarketSeries(symbol)] as const)),
    fetchFmpProfiles(companySymbols),
    readFreeHiddenGemsSnapshot(),
  ]);
  const markets = new Map(marketEntries);
  const profiles = new Map(profileEntries);
  const financials = new Map(
    (financialSnapshot.records ?? []).map((record) => [record.ticker, record]),
  );

  const sectors: SectorMomentumDataItem[] = definitions.map((sector) => {
    const benchmarkMarket =
      markets.get(sector.benchmarkSymbol) ?? unavailableSeries(sector.benchmarkSymbol);
    const market =
      sector.displayMode === "theme"
        ? buildEqualWeightBasket(
            sector.id,
            sector.companies.map(
              (company) =>
                markets.get(company.ticker) ?? unavailableSeries(company.ticker),
            ),
            benchmarkMarket,
          )
        : benchmarkMarket;
    const relativeStrength = computeRelativeStrength(market, benchmark);
    const companies = sector.companies.map((company) =>
      buildCompanyData(
        company,
        markets.get(company.ticker) ?? unavailableSeries(company.ticker),
        relativeStrength,
        profiles.get(company.ticker),
        financials.get(company.ticker),
      ),
    );
    const momentumScore = computeMomentumScore(market);
    const expectation = computeSectorExpectationScore(companies);
    const marketCapUsd = sumNullable(companies.map((company) => company.marketCapUsd));
    const shortTermAverageReturn3m = averageNullable(
      companies.map((company) => company.market.returns["3m"]),
    );

    return {
      ...sector,
      marketCapUsd,
      market,
      companies,
      momentumScore,
      expectationScore: expectation.score,
      expectationCoverage: expectation.coverage,
      expectationLevel: expectationLevel(expectation.score),
      relativeStrength,
      shortTermAverageReturn3m,
      isOverheated:
        sector.displayMode === "theme" &&
        shortTermAverageReturn3m !== null &&
        shortTermAverageReturn3m > 50,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    benchmark,
    sectors,
    availableRegions: buildAvailableRegions(sectors),
    scoreWeights: SECTOR_SCORE_WEIGHTS,
    disclaimer:
      "これは投資助言ではなく、Yahoo Financeの価格、日次財務スナップショット、手動テーマ設定に基づく状態表示です。テーマ騰落率は構成銘柄の等ウェイト集計で、取得不可データは推測で補完しません。",
  };
}

async function fetchFmpProfiles(symbols: string[]) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [] as Array<[string, FmpProfile]>;

  const settled = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const response = await fetch(
        `${FMP_BASE_URL}/profile/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`,
        {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(8000),
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) throw new Error(`FMP profile failed: ${symbol}`);
      const payload = (await response.json()) as FmpProfile[];
      return [symbol, payload[0]] as const;
    }),
  );

  return settled.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value[1]) return [];
    return [result.value];
  });
}

async function fetchMarketSeries(symbol: string): Promise<SectorMarketSeries> {
  try {
    const response = await fetch(
      `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=5y`,
      {
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "application/json",
          "User-Agent": "Macro-Crisis-Dashboard/1.0",
        },
      },
    );

    if (!response.ok) return unavailableSeries(symbol);

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
    const close = adjusted ?? result?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps.flatMap<PricePoint>((time, index) => {
      const value = close[index];
      if (!Number.isFinite(value)) return [];
      return [{ date: new Date(time * 1000), close: value as number }];
    });

    if (points.length < 2) return unavailableSeries(symbol);

    const latest = points[points.length - 1];
    return {
      symbol,
      price: result?.meta?.regularMarketPrice ?? latest.close,
      currency: result?.meta?.currency ?? null,
      observedAt: result?.meta?.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : latest.date.toISOString(),
      returns: computeReturns(points),
      rangePosition: computeRangePosition(points),
      history: points.map((point) => ({
        date: point.date.toISOString().slice(0, 10),
        value: point.close,
      })),
      sourceName: "Yahoo Finance chart data",
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      status: "live",
    };
  } catch {
    return unavailableSeries(symbol);
  }
}

function unavailableSeries(symbol: string): SectorMarketSeries {
  return {
    symbol,
    price: null,
    currency: null,
    observedAt: null,
    returns: unavailableReturns,
    rangePosition: {
      week52: null,
      fiveYearHighDistance: null,
    },
    history: [],
    sourceName: "Yahoo Finance chart data",
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
    status: "unavailable",
  };
}

function buildEqualWeightBasket(
  id: string,
  members: SectorMarketSeries[],
  fallback: SectorMarketSeries,
): SectorMarketSeries {
  const available = members.filter(
    (member) => member.status === "live" && member.history.length > 1,
  );
  if (available.length === 0) return fallback;

  const normalizedByDate = new Map<string, number[]>();
  available.forEach((member) => {
    const latest = member.history.at(-1)?.value;
    if (!latest) return;
    member.history.forEach((point) => {
      const values = normalizedByDate.get(point.date) ?? [];
      values.push((point.value / latest) * 100);
      normalizedByDate.set(point.date, values);
    });
  });
  const minimumCoverage = Math.max(1, Math.ceil(available.length * 0.35));
  const history = Array.from(normalizedByDate.entries())
    .filter(([, values]) => values.length >= minimumCoverage)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      value: values.reduce((total, value) => total + value, 0) / values.length,
    }));
  const points = history.map((point) => ({
    date: new Date(`${point.date}T00:00:00.000Z`),
    close: point.value,
  }));
  const observedAt = available
    .map((member) => member.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    symbol: `BASKET:${id}`,
    price: 100,
    currency: null,
    observedAt,
    returns: Object.fromEntries(
      periods.map((period) => [
        period,
        averageNullable(available.map((member) => member.returns[period])),
      ]),
    ) as ReturnMap,
    rangePosition:
      points.length > 1
        ? computeRangePosition(points)
        : { week52: null, fiveYearHighDistance: null },
    history,
    sourceName: `Yahoo Finance 構成銘柄等ウェイト (${available.length}/${members.length}銘柄)`,
    sourceUrl: fallback.sourceUrl,
    status: "live",
  };
}

function computeReturns(points: PricePoint[]): ReturnMap {
  const latest = points[points.length - 1];
  const year = latest.date.getUTCFullYear();
  const ytdPoint = points.find((point) => point.date.getUTCFullYear() === year) ?? points[0];
  return {
    "1d": percentChange(latest.close, points.at(-2)?.close ?? null),
    "1w": percentChange(latest.close, points.at(-6)?.close ?? null),
    "1m": percentChange(latest.close, points.at(-22)?.close ?? null),
    "3m": percentChange(latest.close, points.at(-64)?.close ?? null),
    ytd: percentChange(latest.close, ytdPoint.close),
    "1y": percentChange(latest.close, points.at(-253)?.close ?? null),
    "3y": percentChange(latest.close, points.at(-757)?.close ?? null),
    "5y": percentChange(latest.close, points[0]?.close ?? null),
  };
}

function computeRangePosition(points: PricePoint[]) {
  const latest = points[points.length - 1]?.close;
  const last252 = points.slice(-252).map((point) => point.close);
  const all = points.map((point) => point.close);
  if (!Number.isFinite(latest)) {
    return { week52: null, fiveYearHighDistance: null };
  }
  const weekLow = Math.min(...last252);
  const weekHigh = Math.max(...last252);
  const fiveYearHigh = Math.max(...all);
  return {
    week52:
      weekHigh === weekLow
        ? null
        : clamp(((latest - weekLow) / (weekHigh - weekLow)) * 100, 0, 100),
    fiveYearHighDistance:
      fiveYearHigh === 0 ? null : ((latest - fiveYearHigh) / fiveYearHigh) * 100,
  };
}

function percentChange(current: number, previous: number | null) {
  if (!Number.isFinite(current) || !previous || !Number.isFinite(previous)) return null;
  return ((current - previous) / previous) * 100;
}

function computeMomentumScore(market: SectorMarketSeries) {
  if (market.status === "unavailable") return null;
  const oneMonth = scoreReturn(market.returns["1m"], -8, 12);
  const threeMonth = scoreReturn(market.returns["3m"], -15, 25);
  const oneYear = scoreReturn(market.returns["1y"], -25, 45);
  const range = market.rangePosition.week52;
  if ([oneMonth, threeMonth, oneYear, range].some((value) => value === null)) return null;
  return Math.round((oneMonth! * 0.24) + (threeMonth! * 0.32) + (oneYear! * 0.24) + (range! * 0.2));
}

function scoreReturn(value: number | null, floor: number, ceiling: number) {
  if (value === null) return null;
  return clamp(((value - floor) / (ceiling - floor)) * 100, 0, 100);
}

function computeRelativeStrength(market: SectorMarketSeries, benchmark: SectorMarketSeries) {
  const sectorReturn = market.returns["3m"];
  const benchmarkReturn = benchmark.returns["3m"];
  if (sectorReturn === null || benchmarkReturn === null) return null;
  return sectorReturn - benchmarkReturn;
}

function buildCompanyData(
  company: SectorCompanyConfig,
  market: SectorMarketSeries,
  sectorRelativeStrength: number | null,
  profile: FmpProfile | undefined,
  financial: HiddenGemUniverseRecord | undefined,
): SectorCompanyData {
  const expectation = computeExpectationScore(
    company.expectation,
    sectorRelativeStrength,
  );
  const manualNote = companyBusinessNotes[company.ticker];
  const fmpDescription = profile?.description ? shortenDescription(profile.description) : null;
  const batchDescription = financial?.businessSummary
    ? shortenDescription(financial.businessSummary)
    : null;
  const businessSummary =
    manualNote ?? fmpDescription ?? batchDescription ?? company.businessSummary;
  const marketCapUsd = Number.isFinite(profile?.mktCap)
    ? (profile?.mktCap as number)
    : (financial?.marketCapUsd ?? company.marketCapUsd);
  return {
    ...company,
    name: profile?.companyName ?? company.name,
    exchange: profile?.exchangeShortName ?? company.exchange,
    countryCode: profile?.country ?? company.countryCode,
    businessSummary,
    marketCapUsd,
    fundamentals: {
      ...company.fundamentals,
      revenueGrowthYoY:
        financial?.revenueGrowthYoY ?? company.fundamentals.revenueGrowthYoY,
      netIncome: financial?.netIncomeLatest ?? company.fundamentals.netIncome,
      epsGrowthYoY:
        financial?.epsGrowthYoY ?? company.fundamentals.epsGrowthYoY,
      forwardPE: financial?.peRatio ?? company.fundamentals.forwardPE,
      grossMargin: financial?.grossMargin ?? company.fundamentals.grossMargin,
    },
    market,
    expectationScore: expectation.score,
    expectationCoverage: expectation.coverage,
    expectationLevel: expectationLevel(expectation.score),
    profileSource: manualNote
      ? "manual"
      : fmpDescription
        ? "fmp"
        : batchDescription
          ? "batch"
          : "unavailable",
  };
}

function computeSectorExpectationScore(companies: SectorCompanyData[]) {
  const companyScores = companies
    .filter((company) => company.expectationScore !== null);
  if (companyScores.length === 0) {
    return {
      score: null,
      coverage: averageNullable(companies.map((company) => company.expectationCoverage)) ?? 0,
    };
  }
  return {
    score: Math.round(
      companyScores.reduce(
        (total, company) => total + (company.expectationScore ?? 0),
        0,
      ) / companyScores.length,
    ),
    coverage:
      averageNullable(companyScores.map((company) => company.expectationCoverage)) ?? 0,
  };
}

function computeExpectationScore(
  expectation: SectorCompanyConfig["expectation"],
  sectorRelativeStrength: number | null,
) {
  const parts = [
    [normalizeInput(expectation.socialSearchGrowth), SECTOR_SCORE_WEIGHTS.socialSearchGrowth],
    [normalizeInput(expectation.analystRevision), SECTOR_SCORE_WEIGHTS.analystRevision],
    [scoreReturn(expectation.relativeMomentum ?? sectorRelativeStrength, -12, 18), SECTOR_SCORE_WEIGHTS.relativeMomentum],
    [normalizeInput(expectation.fundFlow), SECTOR_SCORE_WEIGHTS.fundFlow],
  ] as const;
  const available = parts.filter((part): part is readonly [number, number] => part[0] !== null);
  const weightTotal = available.reduce((total, [, weight]) => total + weight, 0);
  if (weightTotal < 0.5) return { score: null, coverage: weightTotal };
  return {
    score: Math.round(
      available.reduce((total, [value, weight]) => total + value * weight, 0) /
        weightTotal,
    ),
    coverage: weightTotal,
  };
}

function normalizeInput(value: number | null) {
  if (value === null) return null;
  return clamp(value, 0, 100);
}

function expectationLevel(score: number | null): SectorMomentumLevel {
  if (score === null) return "unavailable";
  if (score >= 70) return "high";
  if (score >= 42) return "medium";
  return "low";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function shortenDescription(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 92) return cleaned;
  return `${cleaned.slice(0, 92).replace(/\s+\S*$/, "")}...`;
}

function sumNullable(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null);
  if (available.length === 0) return null;
  return available.reduce((total, value) => total + value, 0);
}

function averageNullable(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null);
  if (available.length === 0) return null;
  return available.reduce((total, value) => total + value, 0) / available.length;
}

function buildAvailableRegions(sectors: SectorMomentumDataItem[]) {
  const ids = new Set<SectorRegion>();
  sectors.forEach((sector) => {
    sector.companies.forEach((company) => ids.add(company.region));
  });
  return Array.from(ids).map((id) => ({ id, label: regionLabels[id] }));
}
