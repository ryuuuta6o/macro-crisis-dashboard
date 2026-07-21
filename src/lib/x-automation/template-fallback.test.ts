import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateFallback } from "@/lib/x-automation/template-fallback";
import { isValidXText } from "@/lib/x-automation/x-text";
import type { PostCandidate } from "@/types/x-automation";

const candidate: PostCandidate = {
  id: "trend-1",
  themeKey: "trend:ai",
  title: "AI関連テーマの検索・報道量が急上昇",
  category: "trend",
  summary: "検索量が増えています。",
  facts: ["急上昇キーワード AI", "概算検索数 20万件以上"],
  watchNext: "NASDAQとSOXの実際の値動き",
  sourceIds: ["source-1", "source-2"],
  sources: [],
  relatedIndicators: ["NASDAQ", "SOX"],
  anomalyScore: 0,
  investorScore: 0,
  viral: {
    importance: 20,
    freshness: 15,
    topicVelocity: 15,
    japanRelevance: 15,
    spillover: 8,
    surprise: 8,
    forwardInterest: 9,
    categoryBonus: 0,
    penalties: 3,
    total: 87,
  },
  publishedAt: "2026-07-22T00:00:00Z",
};

test("無料定型案は3案ともX文字数内で、検索量を価格予測と扱わない", () => {
  const fallback = buildTemplateFallback(candidate);
  assert.equal(fallback.drafts.length, 3);
  assert.ok(fallback.drafts.every((draft) => isValidXText(draft.text)));
  assert.match(fallback.drafts[0].text, /価格の方向を示すものではありません/);
  assert.deepEqual(fallback.factChecks[0].verified_source_ids, candidate.sourceIds);
});
