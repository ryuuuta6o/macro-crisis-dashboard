import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/config/x-automation";
import { buildPostCandidates, sourcePriority } from "@/lib/x-automation/candidates";
import { isDuplicateCandidate, siteUrlWasUsedToday, textSimilarity } from "@/lib/x-automation/dedupe";
import { isWithinPostingWindow } from "@/lib/x-automation/schedule";
import { withExponentialBackoff } from "@/lib/x-automation/retry";
import { getXWeightedLength, isValidXText } from "@/lib/x-automation/x-text";
import type { AutomationInput, AutomationRun, PostCandidate } from "@/types/x-automation";

const source = { id: "s1", name: "Source A", url: "https://example.com/a", kind: "news" as const, publishedAt: "2026-07-20T00:00:00Z", fetchedAt: "2026-07-20T00:01:00Z" };
const candidate: PostCandidate = {
  id: "c1", themeKey: "market:sp500", title: "S&P 500の変動", category: "market_anomaly", summary: "市場変動", facts: ["前日比-2.1%"], watchNext: "VIX", sourceIds: ["s1"], sources: [source], relatedIndicators: ["VIX"], anomalyScore: 70, investorScore: 0,
  viral: { importance: 20, freshness: 15, topicVelocity: 10, japanRelevance: 10, spillover: 8, surprise: 8, forwardInterest: 8, categoryBonus: 20, penalties: 0, total: 99 }, publishedAt: "2026-07-20T00:00:00Z",
};
const run: AutomationRun = {
  id: "r1", idempotencyKey: "k", slot: "morning", scheduledAt: "2026-07-20T00:00:00Z", startedAt: "2026-07-20T00:00:00Z", completedAt: "2026-07-20T01:00:00Z", status: "posted", dryRun: false, candidates: [candidate], drafts: [], factChecks: [], editorial: null, finalText: "S&P 500の変動。前日比-2.1%。次はVIX。", themeKey: "market:sp500", sources: [source], postId: "1", error: null, metrics: null,
};

test("同一テーマは新事実がないと24時間以内に重複扱い", () => {
  assert.equal(isDuplicateCandidate(candidate, [run], new Date("2026-07-20T02:00:00Z")), true);
  assert.ok(textSimilarity(run.finalText!, candidate.title) > 0);
  assert.equal(isDuplicateCandidate({ ...candidate, facts: [...candidate.facts, "VIXが25へ上昇"] }, [run], new Date("2026-07-20T02:00:00Z")), false);
});

test("X加重文字数は日本語とURLを考慮する", () => {
  assert.equal(getXWeightedLength("abc"), 3);
  assert.equal(getXWeightedLength("市場"), 4);
  assert.equal(getXWeightedLength("https://example.com/very/long/path"), 23);
  assert.equal(isValidXText("市場の変化を確認。"), true);
  assert.equal(isValidXText("市".repeat(141)), false);
});

test("JST投稿時間をUTC日時から判定する", () => {
  assert.equal(isWithinPostingWindow("morning", new Date("2026-07-19T22:15:00Z")), true);
  assert.equal(isWithinPostingWindow("morning", new Date("2026-07-20T02:00:00Z")), false);
});

test("一時障害を指数バックオフで再試行する", async () => {
  let attempts = 0;
  const result = await withExponentialBackoff(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("temporary");
    return "ok";
  }, { attempts: 3, initialDelayMs: 1 });
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("古いニュースは候補から除外し一次情報を優先する", () => {
  const input: AutomationInput = {
    collectedAt: "2026-07-20T00:00:00Z", indicators: [], markets: [], investorSignals: [], newsMode: "mixed",
    news: [{ id: "old", title: "old inflation", summary: "", sourceName: "Source A", sourceUrl: "https://example.com/old", publishedAt: "2026-06-01T00:00:00Z", impactLevel: "red", impactScore: 20, impactCategory: "金融政策", relatedIndicators: ["VIX"], reason: "old" }],
  };
  assert.equal(buildPostCandidates(input, { ...DEFAULT_AUTOMATION_SETTINGS, requireTwoSources: false }).length, 0);
  assert.ok(sourcePriority("Federal Reserve") > sourcePriority("Unknown blog"));
});

test("サイトURLはJSTで1日1回まで", () => {
  const withUrl = { ...run, finalText: `${run.finalText} https://example.com` };
  assert.equal(siteUrlWasUsedToday([withUrl], new Date("2026-07-20T03:00:00Z")), true);
  assert.equal(siteUrlWasUsedToday([withUrl], new Date("2026-07-22T03:00:00Z")), false);
});

