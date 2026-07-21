import { getMarketKind } from "@/lib/x-automation/market-data";
import {
  calculateMarketAnomalyScore,
  calculateViralScore,
} from "@/lib/x-automation/scoring";
import type {
  AutomationInput,
  AutomationSettings,
  AutomationSource,
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

  const uniqueCandidates = [...new Map(
    candidates
      .sort((a, b) => b.viral.total - a.viral.total)
      .map((candidate) => [candidate.themeKey, candidate]),
  ).values()];
  return uniqueCandidates
    .filter((candidate) => candidate.sources.length > 0)
    .slice(0, 10);
}
