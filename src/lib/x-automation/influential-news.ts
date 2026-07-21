import { TRUSTED_INVESTOR_NAMES } from "@/config/x-automation";
import type { MarketNewsItem } from "@/types/indicator";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const POLICY_NAMES = [
  "Jerome Powell",
  "Kazuo Ueda",
  "Christine Lagarde",
  "Andrew Bailey",
  "Federal Reserve governor",
  "Bank of Japan board member",
] as const;
const TRUSTED_DOMAINS = [
  "reuters.com", "bloomberg.com", "ft.com", "wsj.com", "cnbc.com", "nikkei.com",
  "apnews.com", "bbc.com", "federalreserve.gov", "boj.or.jp", "ecb.europa.eu",
  "blackrock.com", "berkshirehathaway.com", "oaktreecapital.com",
];

type GdeltArticle = { url?: string; title?: string; seendate?: string; domain?: string };
type GdeltResponse = { articles?: GdeltArticle[] };

function parseDate(value?: string) {
  if (!value) return new Date().toISOString();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return match
    ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
    : new Date(value).toISOString();
}

function stableId(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `voice-${Math.abs(hash)}`;
}

export async function getInfluentialVoiceNews(): Promise<MarketNewsItem[]> {
  const names = [...TRUSTED_INVESTOR_NAMES, ...POLICY_NAMES]
    .map((name) => `"${name}"`)
    .join(" OR ");
  const params = new URLSearchParams({
    query: `(${names}) (markets OR rates OR inflation OR position OR warning OR holdings) sourcelang:english`,
    mode: "artlist",
    format: "json",
    maxrecords: "100",
    timespan: "2d",
    sort: "datedesc",
  });
  const response = await fetch(`${GDELT_URL}?${params}`, {
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json", "User-Agent": "MacroCrisisDashboard/1.0" },
  });
  if (!response.ok) throw new Error(`Influential voice GDELT failed: ${response.status}`);
  const payload = (await response.json()) as GdeltResponse;
  return (payload.articles ?? []).flatMap((article) => {
    if (!article.url || !article.title || !article.domain) return [];
    const domainName = article.domain;
    if (!TRUSTED_DOMAINS.some((domain) => domainName === domain || domainName.endsWith(`.${domain}`))) return [];
    const publishedAt = parseDate(article.seendate);
    const matchedPerson = [...TRUSTED_INVESTOR_NAMES, ...POLICY_NAMES].find((name) =>
      article.title!.toLowerCase().includes(name.toLowerCase())
      || article.title!.toLowerCase().includes(name.split(" ").at(-1)!.toLowerCase()),
    );
    if (!matchedPerson) return [];
    return [{
      id: stableId(article.url),
      title: article.title,
      summary: "信頼性の高い報道で確認された著名投資家・政策当局者の関連情報です。原文にない断定や引用は行いません。",
      sourceName: domainName,
      sourceUrl: article.url,
      publishedAt,
      impactLevel: "yellow" as const,
      impactScore: 12,
      impactCategory: `著名人:${matchedPerson}`,
      relatedIndicators: ["VIX", "HY OAS", "DGS10"],
      reason: "発言やポジション変更が市場の金利・信用・ボラティリティへ波及したかを確認します。",
    }];
  });
}
