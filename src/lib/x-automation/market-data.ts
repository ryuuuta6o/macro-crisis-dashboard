import { MARKET_WATCHLIST } from "@/config/x-automation";
import { calculateZScore } from "@/lib/x-automation/scoring";
import type { MarketSnapshot } from "@/types/x-automation";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export type MarketKind = (typeof MARKET_WATCHLIST)[number][3];

export async function fetchMarketSnapshot(
  item: (typeof MARKET_WATCHLIST)[number],
): Promise<MarketSnapshot> {
  const [id, name, ticker] = item;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=3mo&interval=1d`;
  const [response, intradayResult] = await Promise.all([
    fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 MacroCrisisDashboard/1.0" },
    }),
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=5m`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 MacroCrisisDashboard/1.0" },
    }).then(async (result) => result.ok ? await result.json() as YahooChartResponse : null).catch(() => null),
  ]);
  if (!response.ok) throw new Error(`Yahoo Chart ${ticker}: ${response.status}`);
  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points = closes.flatMap((close, index) =>
    close !== null && close !== undefined && Number.isFinite(close) && timestamps[index]
      ? [{ value: close, timestamp: timestamps[index] }]
      : [],
  );
  if (points.length < 22) throw new Error(`${ticker}: insufficient history`);
  const latest = points.at(-1)!;
  const previous = points.at(-2)!;
  const returns = points.slice(-22).flatMap((point, index, values) => {
    if (index === 0) return [];
    return [((point.value - values[index - 1].value) / values[index - 1].value) * 100];
  }).reverse();
  const intradayCloses = intradayResult?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
    ?.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value)) ?? [];
  const intradayLatest = intradayCloses.at(-1);
  const intradayPrevious = intradayCloses.at(-13);
  const shortChangePercent = intradayLatest !== undefined && intradayPrevious !== undefined
    ? ((intradayLatest - intradayPrevious) / intradayPrevious) * 100
    : null;
  return {
    id,
    name,
    ticker,
    value: latest.value,
    previousClose: previous.value,
    changePercent: ((latest.value - previous.value) / previous.value) * 100,
    shortChangePercent,
    zScore20: calculateZScore(returns),
    observedAt: new Date(latest.timestamp * 1000).toISOString(),
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`,
    history: points.slice(-60).map((point) => point.value),
  };
}

export async function getMarketSnapshots() {
  const settled = await Promise.allSettled(MARKET_WATCHLIST.map(fetchMarketSnapshot));
  return settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

export function getMarketKind(id: string): MarketKind {
  return MARKET_WATCHLIST.find((item) => item[0] === id)?.[3] ?? "equity";
}
