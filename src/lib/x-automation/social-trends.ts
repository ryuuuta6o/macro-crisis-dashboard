import { XMLParser } from "fast-xml-parser";
import type { AutomationSource, SocialTrendSignal } from "@/types/x-automation";

const GOOGLE_TRENDS_REGIONS = [
  { geo: "JP", label: "Japan" },
  { geo: "US", label: "United States" },
] as const;
const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_SOCIAL_QUERY = [
  '"stock market"', '"Federal Reserve"', '"Treasury yield"', '"private credit"',
  'Nvidia', 'semiconductor', 'bitcoin', 'inflation', 'oil', 'yen', 'banking stress',
].join(" OR ");

type TrendNewsItem = {
  "ht:news_item_title"?: unknown;
  "ht:news_item_url"?: unknown;
  "ht:news_item_source"?: unknown;
};

type TrendItem = {
  title?: unknown;
  "ht:approx_traffic"?: unknown;
  pubDate?: unknown;
  "ht:news_item"?: TrendNewsItem | TrendNewsItem[];
};

type GdeltArticle = { url?: string; title?: string; seendate?: string; domain?: string };
type GdeltResponse = { articles?: GdeltArticle[] };

type FinanceRule = {
  category: string;
  terms: string[];
  indicators: string[];
};

const FINANCE_RULES: FinanceRule[] = [
  {
    category: "株価・企業",
    terms: ["株価", "株式", "日経", "topix", "s&p", "nasdaq", "ダウ", "半導体", "nvidia", "エヌビディア", "tesla", "テスラ", "トヨタ", "決算", "上場", "ipo", "stock", "stocks", "shares", "earnings", "wall street"],
    indicators: ["日経平均", "S&P 500", "NASDAQ", "VIX"],
  },
  {
    category: "AI・テクノロジー",
    terms: ["ai", "人工知能", "gpu", "データセンター", "openai", "半導体", "hbm", "量子コンピュータ", "サイバーセキュリティ"],
    indicators: ["NASDAQ", "SOX", "AI Capex", "VIX"],
  },
  {
    category: "金利・為替",
    terms: ["ドル円", "為替", "円安", "円高", "金利", "国債", "日銀", "frb", "fomc", "パウエル", "利上げ", "利下げ", "dollar", "bond", "bonds", "yield", "central bank", "fed "],
    indicators: ["ドル円", "DGS10", "DGS30", "SOFR"],
  },
  {
    category: "経済・政策",
    terms: ["cpi", "インフレ", "雇用統計", "失業率", "景気後退", "recession", "関税", "財政赤字", "gdp", "中国経済", "economy", "economic", "tariff", "inflation", "jobs report"],
    indicators: ["失業保険申請件数", "PMI", "DGS10", "VIX"],
  },
  {
    category: "商品・暗号資産",
    terms: ["ビットコイン", "bitcoin", "暗号資産", "仮想通貨", "原油", "wti", "金価格", "ゴールド", "gold", "ウラン", "crude", "oil price", "crypto"],
    indicators: ["Bitcoin", "WTI原油", "金", "ドル円"],
  },
  {
    category: "金融システム",
    terms: ["銀行", "信用不安", "デフォルト", "倒産", "社債", "プライベートクレジット", "商業不動産", "cmbs", "流動性", "bank", "banks", "debt", "credit", "default", "liquidity"],
    indicators: ["HY OAS", "IG OAS", "SOFR", "銀行預金流出"],
  },
];

function scalar(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function parseTrendTraffic(value: string) {
  const normalized = value.replace(/[,+\s]/g, "").toUpperCase();
  const numeric = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  if (normalized.includes("M") || normalized.includes("百万")) return Math.round(numeric * 1_000_000);
  if (normalized.includes("K") || normalized.includes("万")) return Math.round(numeric * (normalized.includes("万") ? 10_000 : 1_000));
  return Math.round(numeric);
}

function stableId(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `social-trend-${Math.abs(hash)}`;
}

function trendSource(topic: string, publishedAt: string, fetchedAt: string, region: (typeof GOOGLE_TRENDS_REGIONS)[number]): AutomationSource {
  return {
    id: stableId(`google-${region.geo}-${topic}-${publishedAt}`),
    name: `Google Trends ${region.label}`,
    url: `https://trends.google.com/trending?geo=${region.geo}&q=${encodeURIComponent(topic)}`,
    kind: "market_data",
    publishedAt,
    fetchedAt,
  };
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function selectRule(text: string) {
  const lower = text.toLowerCase();
  return FINANCE_RULES
    .map((rule) => ({ rule, hits: rule.terms.filter((term) => lower.includes(term.toLowerCase())).length }))
    .sort((a, b) => b.hits - a.hits)[0];
}

export async function getGoogleTrendSignals(): Promise<SocialTrendSignal[]> {
  const fetchedAt = new Date().toISOString();
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, processEntities: true });
  const regionResults = await Promise.allSettled(GOOGLE_TRENDS_REGIONS.map(async (region) => {
    const response = await fetch(`https://trends.google.com/trending/rss?geo=${region.geo}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "MacroCrisisDashboard/1.0" },
    });
    if (!response.ok) throw new Error(`Google Trends ${region.geo} RSS failed: ${response.status}`);
    const parsed = parser.parse(await response.text()) as { rss?: { channel?: { item?: TrendItem | TrendItem[] } } };
    const rawItems = parsed.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    return items.map((item) => ({ item, region }));
  }));
  const items = regionResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);

  return items.flatMap(({ item, region }) => {
    const topic = scalar(item.title);
    const trafficLabel = scalar(item["ht:approx_traffic"]);
    const publishedAt = parseDate(scalar(item.pubDate));
    const rawNews = item["ht:news_item"];
    const newsItems = (Array.isArray(rawNews) ? rawNews : rawNews ? [rawNews] : []).flatMap((news) => {
      const title = scalar(news["ht:news_item_title"]);
      const url = scalar(news["ht:news_item_url"]);
      const sourceName = scalar(news["ht:news_item_source"]);
      return title && url && sourceName ? [{ title, url, sourceName }] : [];
    });
    if (!topic) return [];
    const selected = selectRule(topic);
    if (!selected || selected.hits === 0) return [];

    const trafficEstimate = parseTrendTraffic(trafficLabel);
    const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
    const distinctNewsSources = new Set(newsItems.map((news) => news.sourceName));
    const trafficScore = Math.min(35, Math.max(5, Math.log10(Math.max(100, trafficEstimate)) * 9));
    const freshnessScore = ageHours <= 2 ? 20 : ageHours <= 6 ? 16 : ageHours <= 12 ? 11 : 6;
    const confirmationScore = Math.min(25, distinctNewsSources.size * 8);
    const relevanceScore = Math.min(20, selected.hits * 7);
    const score = Math.round(Math.min(100, trafficScore + freshnessScore + confirmationScore + relevanceScore));
    if (score < 45) return [];

    const sources: AutomationSource[] = [
      trendSource(topic, publishedAt, fetchedAt, region),
      ...newsItems.map((news, index) => ({
        id: stableId(`${news.url}-${index}`),
        name: news.sourceName,
        url: news.url,
        kind: "news" as const,
        publishedAt,
        fetchedAt,
      })),
    ];
    return [{
      id: stableId(`${region.geo}-${topic}-${publishedAt}`),
      topic,
      trafficLabel: trafficLabel || "取得値なし",
      trafficEstimate,
      publishedAt,
      category: selected.rule.category,
      score,
      summary: `${region.label}の検索量が通常より増え、関連報道${distinctNewsSources.size}媒体を確認しました。話題量は価格方向の予測ではありません。`,
      headlines: newsItems.slice(0, 3).map((news) => news.title),
      relatedIndicators: selected.rule.indicators,
      sources,
    }];
  }).sort((a, b) => b.score - a.score).slice(0, 12);
}

function parseGdeltDate(value?: string) {
  if (!value) return new Date().toISOString();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return match
    ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
    : parseDate(value);
}

export async function getNewsDensitySignals(): Promise<SocialTrendSignal[]> {
  const fetchedAt = new Date().toISOString();
  const params = new URLSearchParams({
    query: `(${GDELT_SOCIAL_QUERY}) sourcelang:english`,
    mode: "artlist",
    format: "json",
    maxrecords: "250",
    timespan: "24h",
    sort: "datedesc",
  });
  const response = await fetch(`${GDELT_URL}?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(25_000),
    headers: { Accept: "application/json", "User-Agent": "MacroCrisisDashboard/1.0" },
  });
  if (!response.ok) throw new Error(`GDELT trend density failed: ${response.status}`);
  const payload = await response.json() as GdeltResponse;
  const grouped = new Map<string, { rule: FinanceRule; articles: Array<Required<GdeltArticle>> }>();

  for (const article of payload.articles ?? []) {
    if (!article.url || !article.title || !article.domain || !article.seendate) continue;
    const selected = selectRule(article.title);
    if (!selected || selected.hits === 0) continue;
    const current = grouped.get(selected.rule.category) ?? { rule: selected.rule, articles: [] };
    current.articles.push(article as Required<GdeltArticle>);
    grouped.set(selected.rule.category, current);
  }

  return [...grouped.values()].flatMap(({ rule, articles }) => {
    const uniqueDomains = [...new Set(articles.map((article) => article.domain))];
    if (articles.length < 3 || uniqueDomains.length < 3) return [];
    const topTerm = rule.terms
      .map((term) => ({ term, count: articles.filter((article) => article.title.toLowerCase().includes(term.toLowerCase())).length }))
      .sort((a, b) => b.count - a.count)[0];
    const topic = topTerm?.count ? topTerm.term : rule.category;
    const publishedAt = articles.map((article) => parseGdeltDate(article.seendate)).sort((a, b) => b.localeCompare(a))[0];
    const score = Math.round(Math.min(100, 35 + Math.min(30, articles.length * 2) + Math.min(25, uniqueDomains.length * 4)));
    const seenDomains = new Set<string>();
    const sourceArticles = articles.filter((article) => {
      if (seenDomains.has(article.domain)) return false;
      seenDomains.add(article.domain);
      return true;
    }).slice(0, 6);
    return [{
      id: stableId(`gdelt-${rule.category}-${publishedAt}`),
      topic,
      trafficLabel: `関連報道 ${articles.length}件/24時間`,
      trafficEstimate: articles.length,
      publishedAt,
      category: rule.category,
      score,
      summary: `24時間で関連報道${articles.length}件・${uniqueDomains.length}媒体を確認しました。報道量は価格方向の予測ではありません。`,
      headlines: articles.slice(0, 3).map((article) => article.title),
      relatedIndicators: rule.indicators,
      sources: sourceArticles.map((article, index) => ({
        id: stableId(`gdelt-${article.url}-${index}`),
        name: article.domain,
        url: article.url,
        kind: "news" as const,
        publishedAt: parseGdeltDate(article.seendate),
        fetchedAt,
      })),
    }];
  }).sort((a, b) => b.score - a.score).slice(0, 8);
}

export async function getSocialTrendFeed() {
  const [googleResult, densityResult] = await Promise.allSettled([
    getGoogleTrendSignals(),
    getNewsDensitySignals(),
  ]);
  const googleItems = googleResult.status === "fulfilled" ? googleResult.value : [];
  const densityItems = densityResult.status === "fulfilled" ? densityResult.value : [];
  const items = [...googleItems, ...densityItems]
    .sort((a, b) => b.score - a.score)
    .filter((item, index, values) => values.findIndex((other) => other.category === item.category && other.topic.toLowerCase() === item.topic.toLowerCase()) === index)
    .slice(0, 12);
  const mode = googleItems.length > 0 && densityItems.length > 0
    ? "mixed" as const
    : googleItems.length > 0
      ? "google_trends" as const
      : densityItems.length > 0
        ? "news_density" as const
        : "unavailable" as const;
  return { items, mode };
}

export async function getSocialTrendSignals() {
  return (await getSocialTrendFeed()).items;
}
