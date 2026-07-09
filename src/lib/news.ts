import fallbackNewsData from "@/data/news.json";
import { XMLParser } from "fast-xml-parser";
import type { MarketNewsFeed, MarketNewsItem } from "@/types/indicator";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_QUERY = [
  '"credit spread"',
  '"bank failure"',
  '"liquidity stress"',
  '"funding stress"',
  '"treasury auction"',
  '"commercial real estate"',
  '"private credit"',
  '"Federal Reserve"',
  '"inflation"',
  '"unemployment"',
  '"recession"',
].join(" OR ");

const OFFICIAL_FEEDS = [
  {
    sourceName: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
  },
  {
    sourceName: "FDIC",
    url: "https://public.govdelivery.com/topics/USFDIC_26/feed.rss",
  },
  {
    sourceName: "U.S. SEC",
    url: "https://www.sec.gov/news/pressreleases.rss",
  },
] as const;

type GdeltArticle = {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  sourcecountry?: string;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

type RssItem = {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  date?: unknown;
  "dc:date"?: unknown;
};

type Rule = {
  phrases: string[];
  score: number;
};

type LinkRule = {
  phrases: string[];
  category: string;
  indicators: string[];
  reason: string;
};

const scoreRules: Rule[] = [
  {
    score: 10,
    phrases: [
      "default",
      "bankruptcy",
      "liquidity crisis",
      "failed auction",
      "bank run",
      "credit crunch",
      "systemic risk",
      "redemption gate",
      "funding stress",
    ],
  },
  {
    score: 7,
    phrases: [
      "commercial real estate",
      "cmbs",
      "private credit",
      "leveraged loan",
      "clo",
      "credit spread",
      "treasury auction",
      "deposit outflow",
      "downgrade",
    ],
  },
  {
    score: 5,
    phrases: [
      "federal reserve",
      "hawkish",
      "inflation",
      "higher yields",
      "unemployment",
      "recession",
      "nvidia",
      "ai capex",
      "data center",
    ],
  },
  {
    score: 3,
    phrases: [
      "oil",
      "geopolitical risk",
      "china property",
      "yen carry trade",
      "dollar funding",
    ],
  },
];

const redPhrases = [
  "default",
  "bankruptcy",
  "crisis",
  "failed auction",
  "liquidity stress",
  "bank run",
  "redemption gate",
  "systemic risk",
];
const yellowPhrases = [
  "warning",
  "concern",
  "hawkish",
  "higher yields",
  "downgrade",
  "weak demand",
  "delinquency",
  "stress",
];
const greenPhrases = [
  "easing",
  "improving",
  "stable",
  "lower yields",
  "recovery",
  "resilient",
];

const linkRules: LinkRule[] = [
  {
    phrases: ["treasury auction", "failed auction", "weak demand", "bond auction"],
    category: "米国債市場",
    indicators: ["DGS10", "DGS30", "MOVE"],
    reason:
      "米国債需要の弱さが意識されています。長期金利とMOVE指数を確認してください。",
  },
  {
    phrases: [
      "commercial real estate",
      "cmbs",
      "office loan",
      "delinquency",
    ],
    category: "CRE",
    indicators: ["Office CMBS", "CMBS全体", "HY OAS"],
    reason:
      "商業不動産の信用悪化が進んでいます。HY OASへの波及に注意が必要です。",
  },
  {
    phrases: [
      "private credit",
      "redemption gate",
      "pik",
      "leveraged loan",
      "clo",
    ],
    category: "Private Credit",
    indicators: ["Private Credit Default Rate", "PIK比率", "HY OAS"],
    reason:
      "プライベートクレジット市場のストレスです。PIK比率やデフォルト率を確認してください。",
  },
  {
    phrases: ["credit spread", "credit crunch", "downgrade", "bankruptcy"],
    category: "信用市場",
    indicators: ["HY OAS", "IG OAS", "CCC OAS", "BAA-AAA"],
    reason:
      "企業の資金調達環境に関係する材料です。信用スプレッドの拡大有無を確認してください。",
  },
  {
    phrases: ["deposit outflow", "bank run", "bank deposits"],
    category: "銀行流動性",
    indicators: ["銀行預金流出", "MMF残高", "SOFR"],
    reason:
      "銀行預金の移動は短期流動性へ影響します。MMF残高とSOFRを確認してください。",
  },
  {
    phrases: ["nvidia", "ai capex", "data center"],
    category: "AI設備投資",
    indicators: ["AI Capex ROI", "Nasdaq", "VIX"],
    reason:
      "AI投資の収益化に関する材料です。VIXや半導体関連の変動を確認してください。",
  },
  {
    phrases: ["federal reserve", "hawkish", "inflation", "higher yields"],
    category: "金融政策",
    indicators: ["DGS10", "DGS30", "VIX", "IG OAS"],
    reason:
      "金融政策と金利見通しが、長期金利と企業の資金調達環境に影響する材料です。",
  },
  {
    phrases: ["dollar funding", "funding stress", "liquidity crisis"],
    category: "短期流動性",
    indicators: ["SOFR", "銀行預金流出", "HY OAS"],
    reason:
      "ドル資金調達の緊張に関する材料です。SOFRと信用市場への波及を確認してください。",
  },
];

function hasPhrase(text: string, phrase: string) {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

function getImpactLevel(
  text: string,
): MarketNewsItem["impactLevel"] {
  if (includesAny(text, redPhrases)) return "red";
  if (includesAny(text, yellowPhrases)) return "yellow";
  if (includesAny(text, greenPhrases)) return "green";
  return "yellow";
}

function scoreText(text: string) {
  return scoreRules.reduce(
    (total, rule) =>
      total +
      rule.phrases.reduce(
        (score, phrase) => score + (hasPhrase(text, phrase) ? rule.score : 0),
        0,
      ),
    0,
  );
}

function getLink(text: string): LinkRule {
  const matches = linkRules
    .map((rule) => ({
      rule,
      count: rule.phrases.filter((phrase) => hasPhrase(text, phrase)).length,
    }))
    .sort((a, b) => b.count - a.count);

  return matches[0]?.count > 0
    ? matches[0].rule
    : {
        phrases: [],
        category: "市場全般",
        indicators: ["VIX", "HY OAS"],
        reason:
          "市場心理と信用環境に関連する材料です。VIXとHY OASを確認してください。",
      };
}

function parseGdeltDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );
  if (!match) return new Date(value).toISOString();
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function normalizeArticle(article: GdeltArticle): MarketNewsItem | null {
  if (!article.title || !article.url) return null;

  const text = article.title.toLowerCase();
  const link = getLink(text);
  const publishedAt = parseGdeltDate(article.seendate);
  const ageHours =
    (Date.now() - new Date(publishedAt).getTime()) / (60 * 60 * 1000);
  const freshnessBonus = ageHours <= 24 ? 8 : ageHours <= 48 ? 5 : 0;
  const impactLevel = getImpactLevel(text);
  const severityBonus = impactLevel === "red" ? 5 : impactLevel === "yellow" ? 2 : 0;
  const sourceBonus = ["Federal Reserve", "FDIC", "U.S. SEC"].includes(article.domain ?? "") ? 4 : 0;
  const administrativePenalty = includesAny(text, [
    "former employee",
    "prohibition order",
    "civil money penalty",
    "requests comment",
    "customer identification",
    "termination of enforcement",
    "announces appointment",
  ]) ? 8 : 0;
  const impactScore = Math.max(
    0,
    scoreText(text) + freshnessBonus + severityBonus + sourceBonus - administrativePenalty,
  );

  return {
    id: createId(article.url),
    title: article.title.trim(),
    summary: link.reason,
    sourceName: article.domain ?? article.sourcecountry ?? "GDELT source",
    sourceUrl: article.url,
    publishedAt,
    impactLevel,
    impactScore,
    impactCategory: link.category,
    relatedIndicators: link.indicators,
    reason: link.reason,
  };
}

function createId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return `gdelt-${Math.abs(hash)}`;
}

function titleTokens(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function titleSimilarity(left: string, right: string) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return value;
  }
}

export function deduplicateNews(items: MarketNewsItem[]) {
  const result: MarketNewsItem[] = [];

  for (const item of items) {
    const duplicate = result.some((existing) => {
      const hoursApart =
        Math.abs(
          new Date(existing.publishedAt).getTime() -
            new Date(item.publishedAt).getTime(),
        ) /
        (60 * 60 * 1000);
      const sharedIndicators = existing.relatedIndicators.some((indicator) =>
        item.relatedIndicators.includes(indicator),
      );

      return (
        canonicalUrl(existing.sourceUrl) === canonicalUrl(item.sourceUrl) ||
        (hoursApart <= 48 &&
          sharedIndicators &&
          titleSimilarity(existing.title, item.title) >= 0.55)
      );
    });

    if (!duplicate) result.push(item);
  }

  return result;
}

async function fetchGdeltArticles(): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query: `(${GDELT_QUERY}) sourcelang:english`,
    mode: "artlist",
    format: "json",
    maxrecords: "100",
    timespan: "7d",
    sort: "datedesc",
  });
  const response = await fetch(`${GDELT_URL}?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: "application/json",
      "User-Agent": "Macro-Crisis-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`GDELT request failed: ${response.status}`);
  }

  const data = (await response.json()) as GdeltResponse;
  return data.articles ?? [];
}

function scalarText(value: unknown): string | null {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return scalarText(record["#text"] ?? record["__cdata"] ?? record.href);
  }
  return null;
}

async function fetchOfficialFeed(
  feed: (typeof OFFICIAL_FEEDS)[number],
): Promise<MarketNewsItem[]> {
  const response = await fetch(feed.url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "MacroCrisisDashboard/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`${feed.sourceName} RSS failed: ${response.status}`);
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    processEntities: true,
  });
  const parsed = parser.parse(await response.text()) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };
  const rawItems = parsed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return items.slice(0, 40).flatMap((item) => {
    const title = scalarText(item.title);
    const url = scalarText(item.link);
    const date = scalarText(item.pubDate ?? item["dc:date"] ?? item.date);
    if (!title || !url) return [];
    const normalized = normalizeArticle({
      title,
      url,
      seendate: date ?? undefined,
      domain: feed.sourceName,
    });
    return normalized ? [normalized] : [];
  });
}

export function rankMarketNews(items: MarketNewsItem[]) {
  const now = Date.now();
  return deduplicateNews(
    [...items].sort((a, b) => {
      const ageA = (now - new Date(a.publishedAt).getTime()) / 3_600_000;
      const ageB = (now - new Date(b.publishedAt).getTime()) / 3_600_000;
      const oldPenaltyA = ageA > 48 && a.impactScore < 15 ? 10 : 0;
      const oldPenaltyB = ageB > 48 && b.impactScore < 15 ? 10 : 0;
      return (
        b.impactScore -
        oldPenaltyB -
        (a.impactScore - oldPenaltyA) ||
        new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );
    }),
  );
}

export async function getMarketImpactNewsFeed(): Promise<MarketNewsFeed> {
  const fetchedAt = new Date().toISOString();
  const [gdeltResult, ...officialResults] = await Promise.allSettled([
    fetchGdeltArticles(),
    ...OFFICIAL_FEEDS.map(fetchOfficialFeed),
  ]);

  const gdeltItems = gdeltResult.status === "fulfilled"
    ? gdeltResult.value
      .map(normalizeArticle)
      .filter((item): item is MarketNewsItem => item !== null)
      .filter((item) => {
        const ageHours =
          (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000;
        const headlineScore = scoreText(item.title.toLowerCase());
        return headlineScore > 0 && (ageHours <= 48 || item.impactScore >= 15);
      })
    : [];
  const officialItems = officialResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  ).filter((item) => Date.now() - new Date(item.publishedAt).getTime() <= 14 * 86_400_000);
  const liveItems = rankMarketNews([...gdeltItems, ...officialItems]);

  if (liveItems.length >= 3) {
    const mode: MarketNewsFeed["mode"] = gdeltItems.length && officialItems.length
      ? "mixed"
      : gdeltItems.length
        ? "live"
        : "official";
    const items = liveItems.slice(0, 12);
    return {
      items,
      mode,
      fetchedAt,
      latestPublishedAt: items.reduce<string | null>((latest, item) =>
        !latest || new Date(item.publishedAt) > new Date(latest)
          ? item.publishedAt
          : latest, null),
      sourceSummary: mode === "mixed"
        ? "GDELT + FRB・FDIC・SEC公的RSS"
        : mode === "live"
          ? "GDELT live feed"
          : "FRB・FDIC・SEC公的RSS",
      isFallback: false,
    };
  }

  const items = rankMarketNews(fallbackNewsData as MarketNewsItem[]).slice(0, 12);
  return {
    items,
    mode: "fallback",
    fetchedAt,
    latestPublishedAt: items[0]?.publishedAt ?? null,
    sourceSummary: "固定フォールバック（ライブ取得失敗）",
    isFallback: true,
  };
}

export async function getMarketImpactNews(): Promise<MarketNewsItem[]> {
  return (await getMarketImpactNewsFeed()).items;
}
