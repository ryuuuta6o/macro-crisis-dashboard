import { getMarketKind } from "@/lib/x-automation/market-data";
import {
  calculateMarketAnomalyScore,
  calculateViralScore,
} from "@/lib/x-automation/scoring";
import type {
  AutomationInput,
  AutomationSettings,
  AutomationSource,
  GenerationTopic,
  PostCandidate,
} from "@/types/x-automation";

function newsSource(item: AutomationInput["news"][number], fetchedAt: string): AutomationSource {
  return {
    id: item.id,
    name: item.sourceName,
    url: item.sourceUrl,
    kind: ["Federal Reserve", "FDIC", "U.S. SEC"].includes(item.sourceName) ? "official" : "news",
    publishedAt: item.publishedAt,
    fetchedAt,
  };
}

function distinctSources(sources: AutomationSource[]) {
  return [...new Map(sources.map((source) => [`${source.name}|${source.url}`, source])).values()];
}

function freshnessScore(publishedAt: string) {
  const hours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
  return hours <= 6 ? 15 : hours <= 24 ? 12 : hours <= 48 ? 7 : 0;
}

function relevantNews(input: AutomationInput, terms: string[]) {
  return input.news.filter((item) => {
    if (Date.now() - new Date(item.publishedAt).getTime() > 48 * 3_600_000) return false;
    const haystack = `${item.title} ${item.summary} ${item.relatedIndicators.join(" ")}`.toLowerCase();
    return terms.some((term) => haystack.includes(term.toLowerCase()));
  });
}

function sourceCountIsEnough(sources: AutomationSource[], settings: AutomationSettings) {
  if (!settings.requireTwoSources) return sources.length >= 1;
  return new Set(sources.map((source) => source.name)).size >= 2;
}

export function sourcePriority(sourceName: string) {
  if (["Federal Reserve", "FDIC", "U.S. SEC", "U.S. SEC 13F"].includes(sourceName)) return 3;
  if (/\.gov|central bank|bank of japan/i.test(sourceName)) return 2;
  return 1;
}

export function buildPostCandidates(
  input: AutomationInput,
  settings: AutomationSettings,
): PostCandidate[] {
  const candidates: PostCandidate[] = [];

  const watchedIndicators = new Set([
    "hy-oas", "ig-oas", "ccc-oas", "baa-aaa", "vix", "dgs10", "dgs30", "sofr",
    "bank-deposit-outflow", "discount-window", "treasury-auction",
  ]);
  const severity = { unavailable: -1, green: 0, yellow: 1, orange: 2, red: 3 } as const;
  for (const indicator of input.indicators) {
    if (!watchedIndicators.has(indicator.id) || indicator.numericValue === null || indicator.previousNumericValue === null) continue;
    const change = indicator.numericValue - indicator.previousNumericValue;
    const signalWorsened = severity[indicator.signal] > severity[indicator.previousSignal];
    const vixChange = indicator.id === "vix" && indicator.previousNumericValue !== 0
      ? Math.abs(change / indicator.previousNumericValue) * 100
      : 0;
    const ratesMoveBp = indicator.id === "dgs10" || indicator.id === "dgs30" ? Math.abs(change) * 100 : 0;
    const creditMove = ["hy-oas", "ccc-oas"].includes(indicator.id)
      ? Math.abs(change) >= 25
      : ["ig-oas", "baa-aaa", "sofr"].includes(indicator.id) && Math.abs(change) >= 0.1;
    if (!signalWorsened && vixChange < settings.thresholds.vixDailyPercent && ratesMoveBp < settings.thresholds.yieldBasisPoints && !creditMove) continue;
    const news = relevantNews(input, [indicator.name, indicator.shortName, indicator.category, "credit", "yield", "liquidity"]);
    const indicatorUrl = indicator.sourceUrl
      ?? (indicator.fredSeries[0] ? `https://fred.stlouisfed.org/series/${indicator.fredSeries[0]}` : "https://macro-crisis-dashboard.vercel.app/");
    const sources = distinctSources([
      {
        id: `indicator-${indicator.id}-${indicator.observationDate ?? "latest"}`,
        name: indicator.sourceName ?? indicator.sourceLabel ?? indicator.source,
        url: indicatorUrl,
        kind: indicator.source === "FRED" || indicator.source === "treasury" || indicator.source === "ny-fed" || indicator.source === "fiscal-data" ? "official" : "market_data",
        publishedAt: indicator.observationDate ? `${indicator.observationDate}T00:00:00Z` : input.collectedAt,
        fetchedAt: input.collectedAt,
      },
      ...news.slice(0, 3).map((item) => newsSource(item, input.collectedAt)),
    ]);
    if (!sourceCountIsEnough(sources, settings)) continue;
    const anomalyScore = Math.round(Math.min(100,
      (signalWorsened ? 55 : 25) + Math.min(25, vixChange) + Math.min(25, ratesMoveBp) + (creditMove ? 20 : 0),
    ));
    candidates.push({
      id: `indicator-${indicator.id}-${indicator.observationDate ?? "latest"}`,
      themeKey: `indicator:${indicator.id}`,
      title: `${indicator.name}が${indicator.previousValue}${indicator.unit}から${indicator.value}${indicator.unit}へ変化`,
      category: "market_anomaly",
      summary: signalWorsened
        ? `${indicator.name}の信号が${indicator.previousSignal}から${indicator.signal}へ悪化しました。`
        : `${indicator.name}の変化幅が監視ラインを超えました。`,
      facts: [
        `現在値 ${indicator.value}${indicator.unit}`,
        `前回値 ${indicator.previousValue}${indicator.unit}`,
        `変化 ${change >= 0 ? "+" : ""}${change.toFixed(indicator.decimals)}${indicator.unit}`,
      ],
      watchNext: indicator.id.includes("oas") || indicator.id === "baa-aaa"
        ? "HY・IG・CCCへ同時に広がるか"
        : indicator.id.startsWith("dgs") ? "MOVEと国債入札需要" : "信用市場へ波及するか",
      sourceIds: sources.map((source) => source.id),
      sources,
      relatedIndicators: [indicator.name, ...news.flatMap((item) => item.relatedIndicators)],
      anomalyScore,
      investorScore: 0,
      viral: calculateViralScore({
        category: "market_anomaly",
        importance: indicator.importance === "critical" ? 25 : indicator.importance === "important" ? 20 : 15,
        freshness: indicator.observationDate ? freshnessScore(`${indicator.observationDate}T00:00:00Z`) : 5,
        topicVelocity: Math.min(15, news.length * 4),
        japanRelevance: indicator.id.startsWith("dgs") || indicator.id === "vix" ? 12 : 9,
        spillover: 9,
        surprise: signalWorsened ? 9 : 6,
        forwardInterest: 9,
      }),
      publishedAt: indicator.observationDate ? `${indicator.observationDate}T00:00:00Z` : input.collectedAt,
    });
  }

  for (const market of input.markets) {
    const kind = getMarketKind(market.id);
    const anomalyScore = calculateMarketAnomalyScore(market, kind, settings);
    if (anomalyScore < 45) continue;
    const news = relevantNews(input, [market.name, market.ticker, kind, "market", "yield", "inflation"]);
    const sources = distinctSources([
      {
        id: `market-${market.id}`,
        name: "Yahoo Finance Chart",
        url: market.sourceUrl,
        kind: "market_data",
        publishedAt: market.observedAt,
        fetchedAt: input.collectedAt,
      },
      ...news.slice(0, 3).map((item) => newsSource(item, input.collectedAt)),
    ]);
    if (!sourceCountIsEnough(sources, settings)) continue;
    const direction = market.changePercent >= 0 ? "上昇" : "下落";
    candidates.push({
      id: `market-${market.id}-${market.observedAt.slice(0, 10)}`,
      themeKey: market.id === "vix-market" ? "indicator:vix" : `market:${market.id}`,
      title: `${market.name}が前日比${Math.abs(market.changePercent).toFixed(2)}%${direction}`,
      category: "market_anomaly",
      summary: `${market.name}の値動きが平常時より大きくなっています。直接の原因は断定せず、関連市場への波及を確認します。`,
      facts: [
        `${market.name} ${market.value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}`,
        `前日比 ${market.changePercent >= 0 ? "+" : ""}${market.changePercent.toFixed(2)}%`,
        market.zScore20 === null ? "20日z-scoreは算出不可" : `20日z-score ${market.zScore20.toFixed(2)}`,
      ],
      watchNext: kind === "equity" ? "VIXとHY OASが同時に悪化するか" : "株式・信用市場へ波及するか",
      sourceIds: sources.map((source) => source.id),
      sources,
      relatedIndicators: news.flatMap((item) => item.relatedIndicators),
      anomalyScore,
      investorScore: 0,
      viral: calculateViralScore({
        category: "market_anomaly",
        importance: anomalyScore / 4,
        freshness: 15,
        topicVelocity: Math.min(15, news.length * 4),
        japanRelevance: ["nikkei", "topix", "usd-jpy", "taiwan", "sox"].includes(market.id) ? 15 : 10,
        spillover: news.length > 1 ? 10 : 5,
        surprise: Math.min(10, Math.abs(market.zScore20 ?? 0) * 3),
        forwardInterest: 8,
      }),
      publishedAt: market.observedAt,
    });
  }

  const freshNews = input.news.filter((item) =>
    Date.now() - new Date(item.publishedAt).getTime() <= 48 * 3_600_000,
  );
  const groups = new Map<string, typeof freshNews>();
  for (const item of freshNews) {
    const group = groups.get(item.impactCategory) ?? [];
    group.push(item);
    groups.set(item.impactCategory, group);
  }
  for (const [category, items] of groups) {
    const sources = distinctSources(items.map((item) => newsSource(item, input.collectedAt)));
    if (!sourceCountIsEnough(sources, settings)) continue;
    const lead = [...items].sort((a, b) =>
      b.impactScore - a.impactScore || sourcePriority(b.sourceName) - sourcePriority(a.sourceName),
    )[0];
    candidates.push({
      id: `news-${lead.id}`,
      themeKey: `news:${category}`,
      title: lead.title,
      category: "economic_news",
      summary: lead.reason,
      facts: items.slice(0, 3).map((item) => item.title),
      watchNext: lead.relatedIndicators.join("・") || "関連市場の次回値",
      sourceIds: sources.map((source) => source.id),
      sources,
      relatedIndicators: lead.relatedIndicators,
      anomalyScore: 0,
      investorScore: 0,
      viral: calculateViralScore({
        category: "economic_news",
        importance: Math.min(25, lead.impactScore),
        freshness: freshnessScore(lead.publishedAt),
        topicVelocity: Math.min(15, items.length * 4),
        japanRelevance: /Japan|yen|Asia|China|semiconductor/i.test(items.map((item) => item.title).join(" ")) ? 15 : 8,
        spillover: Math.min(10, lead.relatedIndicators.length * 2),
        surprise: lead.impactLevel === "red" ? 9 : 5,
        forwardInterest: 8,
      }),
      publishedAt: lead.publishedAt,
    });
  }

  for (const signal of input.investorSignals) {
    const confirmations = freshNews.filter((item) =>
      item.title.toLowerCase().includes(signal.person.split(" ").at(-1)!.toLowerCase()),
    );
    const sources = distinctSources([
      signal.source,
      ...confirmations.map((item) => newsSource(item, input.collectedAt)),
    ]);
    if (!sourceCountIsEnough(sources, settings)) continue;
    candidates.push({
      id: signal.id,
      themeKey: `investor:${signal.person}`,
      title: signal.title,
      category: "investor_signal",
      summary: signal.summary,
      facts: [signal.title, signal.summary],
      watchNext: "次回13Fと市場価格の反応",
      sourceIds: sources.map((source) => source.id),
      sources,
      relatedIndicators: [],
      anomalyScore: 0,
      investorScore: signal.score,
      viral: calculateViralScore({
        category: "investor_signal",
        importance: signal.score / 4,
        freshness: freshnessScore(signal.filingDate),
        topicVelocity: confirmations.length * 5,
        japanRelevance: 8,
        spillover: 6,
        surprise: 8,
        forwardInterest: 8,
        penalties: 8,
      }),
      publishedAt: signal.filingDate,
    });
  }

  for (const trend of input.socialTrends) {
    const sources = distinctSources(trend.sources);
    if (!sourceCountIsEnough(sources, settings)) continue;
    candidates.push({
      id: trend.id,
      themeKey: `trend:${trend.topic.toLowerCase()}`,
      title: `${trend.topic}の検索・報道量が急上昇`,
      category: "trend",
      summary: trend.summary,
      facts: [
        `急上昇キーワード ${trend.topic}`,
        `概算検索数 ${trend.trafficLabel}`,
        `話題スコア ${trend.score}/100`,
        ...trend.headlines.slice(0, 2),
      ],
      watchNext: `${trend.relatedIndicators.join("・")}の実際の値動き`,
      sourceIds: sources.map((source) => source.id),
      sources,
      relatedIndicators: trend.relatedIndicators,
      anomalyScore: 0,
      investorScore: 0,
      viral: calculateViralScore({
        category: "trend",
        importance: Math.min(25, trend.score / 4),
        freshness: freshnessScore(trend.publishedAt),
        topicVelocity: Math.min(15, trend.score / 6),
        japanRelevance: 15,
        spillover: Math.min(10, trend.relatedIndicators.length * 2),
        surprise: Math.min(10, trend.score / 10),
        forwardInterest: 9,
        penalties: 3,
      }),
      publishedAt: trend.publishedAt,
    });
  }

  const uniqueCandidates = [...new Map(
    candidates
      .sort((a, b) => b.viral.total - a.viral.total)
      .map((candidate) => [candidate.themeKey, candidate]),
  ).values()];
  return uniqueCandidates
    .filter((candidate) => candidate.sources.length > 0)
    .slice(0, 30);
}

const REALTIME_MARKET_IDS: Partial<Record<GenerationTopic, string[]>> = {
  all: ["nikkei", "topix", "sp500", "nasdaq", "sox", "vix-market", "usd-jpy", "gold", "oil", "bitcoin"],
  stock_market: ["nikkei", "topix", "sp500", "nasdaq", "sox", "kospi", "taiwan", "shanghai", "sp-future", "nasdaq-future"],
  fx_commodities_crypto: ["usd-jpy", "eur-usd", "gold", "oil", "bitcoin"],
  japan_asia: ["nikkei", "topix", "kospi", "taiwan", "shanghai", "usd-jpy"],
};

const REALTIME_INDICATOR_IDS: Partial<Record<GenerationTopic, string[]>> = {
  all: ["vix", "dgs10", "hy-oas", "sofr"],
  stock_market: ["vix", "hy-oas", "dgs10"],
  credit_rates: ["dgs10", "dgs30", "hy-oas", "ig-oas", "ccc-oas", "baa-aaa", "sofr", "treasury-auction"],
  fx_commodities_crypto: ["dgs10", "dgs30", "sofr"],
  japan_asia: ["dgs10", "vix", "hy-oas"],
};

function indicatorAutomationSource(
  indicator: AutomationInput["indicators"][number],
  fetchedAt: string,
): AutomationSource {
  const url = indicator.sourceUrl
    ?? (indicator.fredSeries[0] ? `https://fred.stlouisfed.org/series/${indicator.fredSeries[0]}` : "https://macro-crisis-dashboard.vercel.app/");
  return {
    id: `snapshot-indicator-${indicator.id}-${indicator.observationDate ?? "latest"}`,
    name: indicator.sourceName ?? indicator.sourceLabel ?? indicator.source,
    url,
    kind: indicator.source === "FRED" || indicator.source === "treasury" || indicator.source === "ny-fed" || indicator.source === "fiscal-data" ? "official" : "market_data",
    publishedAt: indicator.observationDate ? `${indicator.observationDate}T00:00:00Z` : fetchedAt,
    fetchedAt,
  };
}

export function buildRealtimeSnapshotCandidate(
  input: AutomationInput,
  settings: AutomationSettings,
  topic: GenerationTopic,
  options: { includeContextIndicators?: boolean } = {},
): PostCandidate | null {
  if (topic === "influential_people" || topic === "economy_policy" || topic === "social_trends") return null;

  const marketIds = new Set(REALTIME_MARKET_IDS[topic] ?? REALTIME_MARKET_IDS.all);
  const indicatorIds = new Set(REALTIME_INDICATOR_IDS[topic] ?? REALTIME_INDICATOR_IDS.all);
  const markets = input.markets
    .filter((market) => marketIds?.has(market.id))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, topic === "credit_rates" ? 0 : 3);
  const indicators = (options.includeContextIndicators === false ? [] : input.indicators)
    .filter((indicator) => indicatorIds?.has(indicator.id) && indicator.numericValue !== null)
    .sort((a, b) => {
      const severity = { unavailable: -1, green: 0, yellow: 1, orange: 2, red: 3 } as const;
      return severity[b.signal] - severity[a.signal];
    })
    .slice(0, topic === "credit_rates" ? 4 : 2);

  if (markets.length === 0 && indicators.length === 0) return null;

  const marketSources: AutomationSource[] = markets.map((market) => ({
    id: `snapshot-market-${market.id}-${market.observedAt}`,
    name: "Yahoo Finance Chart",
    url: market.sourceUrl,
    kind: "market_data",
    publishedAt: market.observedAt,
    fetchedAt: input.collectedAt,
  }));
  const sources = distinctSources([
    ...marketSources,
    ...indicators.map((indicator) => indicatorAutomationSource(indicator, input.collectedAt)),
  ]);
  if (!sourceCountIsEnough(sources, settings)) return null;

  const facts = [
    ...markets.map((market) => `${market.name} ${market.value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}（前日比${market.changePercent >= 0 ? "+" : ""}${market.changePercent.toFixed(2)}%）`),
    ...indicators.map((indicator) => `${indicator.name} ${indicator.value}${indicator.unit}（信号 ${indicator.signal}）`),
  ];
  const newestPublishedAt = [...sources]
    .map((source) => source.publishedAt)
    .sort((a, b) => b.localeCompare(a))[0] ?? input.collectedAt;
  const averageMove = markets.length > 0
    ? markets.reduce((sum, market) => sum + Math.abs(market.changePercent), 0) / markets.length
    : 0;
  const topicName = topic === "credit_rates" ? "金利・信用・流動性"
    : topic === "stock_market" ? "株価・指数"
      : topic === "fx_commodities_crypto" ? "為替・商品・暗号資産"
        : topic === "japan_asia" ? "日本・アジア市場"
          : "主要市場";

  return {
    id: `realtime-${topic}-${input.collectedAt}`,
    themeKey: `realtime:${topic}:${input.collectedAt.slice(0, 13)}`,
    title: `${topicName}の最新概況`,
    category: "market_anomaly",
    summary: "最新の市場値と公式指標を組み合わせた定時概況です。異常や原因を断定せず、複数市場の組み合わせを確認します。",
    facts,
    watchNext: topic === "credit_rates"
      ? "信用スプレッドと短期流動性が同時に悪化するか"
      : "株価・VIX・信用市場が同じ方向へ動くか",
    sourceIds: sources.map((source) => source.id),
    sources,
    relatedIndicators: [...markets.map((market) => market.name), ...indicators.map((indicator) => indicator.name)],
    anomalyScore: Math.round(Math.min(100, 30 + averageMove * 12)),
    investorScore: 0,
    viral: calculateViralScore({
      category: "market_anomaly",
      importance: 15,
      freshness: 15,
      topicVelocity: 5,
      japanRelevance: topic === "japan_asia" || markets.some((market) => ["nikkei", "topix", "usd-jpy"].includes(market.id)) ? 15 : 10,
      spillover: markets.length > 1 || indicators.length > 1 ? 8 : 4,
      surprise: Math.min(10, averageMove * 2),
      forwardInterest: 8,
      penalties: 5,
    }),
    publishedAt: newestPublishedAt,
  };
}
