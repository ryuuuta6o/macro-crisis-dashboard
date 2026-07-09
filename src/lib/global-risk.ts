import globalRiskData from "../../data/global-risk.json";
import type {
  GlobalRiskData,
  GlobalMarketPulse,
  GlobalRiskRegion,
} from "@/types/global-risk";
import type { RiskLevel } from "@/types/indicator";

const data = globalRiskData as GlobalRiskData;

const riskWeight: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

type MarketProxy = {
  symbol: string;
  label: string;
  higherIsRisk?: boolean;
};

const marketProxies: Record<string, MarketProxy> = {
  "united-states": { symbol: "^GSPC", label: "S&P 500" },
  china: { symbol: "000001.SS", label: "上海総合指数" },
  germany: { symbol: "^GDAXI", label: "DAX" },
  japan: { symbol: "^N225", label: "日経平均" },
  "united-kingdom": { symbol: "^FTSE", label: "FTSE 100" },
  india: { symbol: "^NSEI", label: "NIFTY 50" },
  france: { symbol: "^FCHI", label: "CAC 40" },
  italy: { symbol: "FTSEMIB.MI", label: "FTSE MIB" },
  russia: { symbol: "IMOEX.ME", label: "MOEX Russia" },
  brazil: { symbol: "^BVSP", label: "Bovespa" },
  canada: { symbol: "^GSPTSE", label: "S&P/TSX" },
  "south-korea": { symbol: "^KS11", label: "KOSPI" },
  taiwan: { symbol: "^TWII", label: "TAIEX" },
  "saudi-arabia": { symbol: "^TASI.SR", label: "Tadawul All Share" },
  "united-arab-emirates": { symbol: "DFMGI.AE", label: "Dubai Financial Market" },
  israel: { symbol: "^TA125.TA", label: "TA-125" },
  iran: { symbol: "USDIRR=X", label: "米ドル / イラン・リアル", higherIsRisk: true },
  egypt: { symbol: "^CASE30", label: "EGX 30" },
  nigeria: { symbol: "USDNGN=X", label: "米ドル / ナイラ", higherIsRisk: true },
  "south-africa": { symbol: "^JN0U.JO", label: "FTSE/JSE Top 40" },
  mexico: { symbol: "^MXX", label: "S&P/BMV IPC" },
  argentina: { symbol: "^MERV", label: "MERVAL" },
  indonesia: { symbol: "^JKSE", label: "Jakarta Composite" },
  australia: { symbol: "^AXJO", label: "S&P/ASX 200" },
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
        currency?: string;
        exchangeName?: string;
      };
    }>;
  };
};

export function getGlobalRiskData() {
  return data;
}

function marketRiskLevel(changePercent: number, higherIsRisk = false): RiskLevel {
  const stressMove = higherIsRisk ? changePercent : -changePercent;
  if (stressMove >= 3) return "red";
  if (stressMove >= 1.5) return "orange";
  if (stressMove >= 0.5) return "yellow";
  return "green";
}

async function fetchMarketPulse(proxy: MarketProxy): Promise<GlobalMarketPulse> {
  const response = await fetch(
    `${YAHOO_CHART_URL}/${encodeURIComponent(proxy.symbol)}?interval=5m&range=1d`,
    {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/json",
        "User-Agent": "Macro-Crisis-Dashboard/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Market data request failed: ${proxy.symbol}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const meta = payload.chart?.result?.[0]?.meta;
  const value = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose ?? meta?.previousClose;

  if (
    !Number.isFinite(value) ||
    !Number.isFinite(previousClose) ||
    !previousClose
  ) {
    throw new Error(`Market data is incomplete: ${proxy.symbol}`);
  }

  const numericValue = value as number;
  const numericPreviousClose = previousClose as number;
  const changePercent =
    ((numericValue - numericPreviousClose) / numericPreviousClose) * 100;

  return {
    symbol: proxy.symbol,
    label: proxy.label,
    value: numericValue,
    previousClose: numericPreviousClose,
    changePercent,
    currency: meta?.currency,
    exchange: meta?.exchangeName,
    level: marketRiskLevel(changePercent, proxy.higherIsRisk),
    observedAt: meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
    sourceName: "Yahoo Finance chart data",
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(proxy.symbol)}`,
    mode: "live_market",
  };
}

export async function getLiveGlobalRiskData(): Promise<GlobalRiskData> {
  const settled = await Promise.allSettled(
    data.regions.map(async (region) => {
      const proxy = marketProxies[region.id];
      return proxy
        ? ([region.id, await fetchMarketPulse(proxy)] as const)
        : null;
    }),
  );

  const pulses = new Map<string, GlobalMarketPulse>();
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      pulses.set(result.value[0], result.value[1]);
    }
  }

  const regions = data.regions.map((region) => {
    const marketPulse = pulses.get(region.id);
    if (!marketPulse) return region;

    const level =
      riskWeight[marketPulse.level] > riskWeight[region.level]
        ? marketPulse.level
        : region.level;

    return { ...region, level, marketPulse };
  });

  return {
    ...data,
    regions,
    marketDataUpdatedAt: new Date().toISOString(),
    refreshIntervalSeconds: 300,
    liveMarketCount: pulses.size,
    dataStatus:
      pulses.size === data.regions.length
        ? "live"
        : pulses.size > 0
          ? "partial"
          : "fallback",
  };
}

export function getGlobalRiskOverall(regions: GlobalRiskRegion[]) {
  const highest = regions.reduce<RiskLevel>(
    (level, region) =>
      riskWeight[region.level] > riskWeight[level] ? region.level : level,
    "green",
  );
  const elevated = regions.filter(
    (region) => riskWeight[region.level] >= riskWeight.orange,
  );
  const highlighted = elevated.slice(0, 5);
  const remaining = elevated.length - highlighted.length;

  return {
    level: highest,
    label:
      highest === "red"
        ? "地域リスクが高い"
        : highest === "orange"
          ? "複数地域で警戒"
          : highest === "yellow"
            ? "地域差に注意"
            : "概ね安定",
    comment:
      elevated.length > 0
        ? `${highlighted.map((region) => region.japaneseName).join("・")}${
            remaining > 0 ? `ほか${remaining}か国` : ""
          }で警戒度が高まっています。世界への波及経路を確認してください。`
        : "世界の主要地域は概ね安定しています。",
  };
}
