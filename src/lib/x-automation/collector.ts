import { getDashboardData } from "@/lib/fred";
import { getMarketImpactNewsFeed, rankMarketNews } from "@/lib/news";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";
import { calculateInvestorSignalScore } from "@/lib/x-automation/scoring";
import { getMarketSnapshots } from "@/lib/x-automation/market-data";
import { getInfluentialVoiceNews } from "@/lib/x-automation/influential-news";
import { getSocialTrendFeed } from "@/lib/x-automation/social-trends";
import type {
  AutomationInput,
  AutomationSource,
  InvestorSignal,
} from "@/types/x-automation";

function sourceId(prefix: string, value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `${prefix}-${Math.abs(hash)}`;
}

async function collectInvestorSignals(): Promise<InvestorSignal[]> {
  const investors = await getSmartMoneyInvestors();
  return investors.flatMap((investor) => {
    if (investor.dataStatus !== "live" || !investor.sourceUrl) return [];
    const position = [...investor.positions]
      .filter((item) => item.changeType !== "継続" && item.changeType !== "小幅変更")
      .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))[0];
    if (!position) return [];
    const ageDays = Math.max(0, (Date.now() - new Date(investor.filingDate).getTime()) / 86_400_000);
    const score = calculateInvestorSignalScore({
      positionChangePercent: position.changePercent ?? 0,
      isNewOrExited: position.changeType === "新規" || position.changeType === "全売却",
      freshnessDays: ageDays,
      japanRelevant: false,
      marketMoved: false,
      sourceIsPrimary: true,
    });
    const source: AutomationSource = {
      id: sourceId("sec", investor.sourceUrl),
      name: "U.S. SEC 13F",
      url: investor.sourceUrl,
      kind: "primary",
      publishedAt: investor.filingDate,
      fetchedAt: new Date().toISOString(),
    };
    return [{
      id: `${investor.slug}-${position.cusip}-${investor.filingDate}`,
      person: investor.investor,
      title: `${investor.investor}の13Fで${position.company}が${position.changeType}`,
      summary: `${position.company}の保有株数変化は${position.changePercent === null ? "算出不可" : `${position.changePercent.toFixed(1)}%`}。13Fは最大45日遅れる補助データです。`,
      filingDate: investor.filingDate,
      score,
      source,
    }];
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function collectAutomationInput(): Promise<AutomationInput> {
  const [dashboardResult, marketResult, newsResult, investorResult, voiceResult, socialResult] = await Promise.allSettled([
    getDashboardData(),
    getMarketSnapshots(),
    getMarketImpactNewsFeed(),
    collectInvestorSignals(),
    getInfluentialVoiceNews(),
    getSocialTrendFeed(),
  ]);
  const dashboard = dashboardResult.status === "fulfilled"
    ? dashboardResult.value
    : { indicators: [], fetchedAt: new Date().toISOString(), unavailableCount: 0 };
  const news = newsResult.status === "fulfilled"
    ? newsResult.value
    : { items: [], mode: "fallback", fetchedAt: new Date().toISOString() };
  return {
    collectedAt: new Date().toISOString(),
    indicators: dashboard.indicators,
    markets: marketResult.status === "fulfilled" ? marketResult.value : [],
    news: rankMarketNews([
      ...news.items,
      ...(voiceResult.status === "fulfilled" ? voiceResult.value : []),
    ]),
    newsMode: news.mode,
    investorSignals: investorResult.status === "fulfilled" ? investorResult.value : [],
    socialTrends: socialResult.status === "fulfilled" ? socialResult.value.items : [],
    socialMode: socialResult.status === "fulfilled" ? socialResult.value.mode : "unavailable",
  };
}
