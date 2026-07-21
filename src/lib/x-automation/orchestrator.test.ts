import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/config/x-automation";
import { runAutomationSlot } from "@/lib/x-automation/orchestrator";
import type { AutomationStore } from "@/lib/x-automation/storage";
import type { AutomationRun, AutomationState, PostCandidate } from "@/types/x-automation";

class MemoryStore implements AutomationStore {
  state: AutomationState = { settings: { ...DEFAULT_AUTOMATION_SETTINGS, dryRun: true }, runs: [], updatedAt: new Date().toISOString() };
  claims = new Set<string>();
  async getState() { return structuredClone(this.state); }
  async saveRun(run: AutomationRun) { this.state.runs = [run, ...this.state.runs.filter((item) => item.id !== run.id)]; }
  async updateSettings(settings: AutomationState["settings"]) { this.state.settings = settings; }
  async claimIdempotency(key: string) { if (this.claims.has(key)) return false; this.claims.add(key); return true; }
}

const sources = [
  { id: "a", name: "Market data", url: "https://example.com/a", kind: "market_data" as const, publishedAt: "2026-07-20T00:00:00Z", fetchedAt: "2026-07-20T00:01:00Z" },
  { id: "b", name: "Official", url: "https://example.gov/b", kind: "official" as const, publishedAt: "2026-07-20T00:00:00Z", fetchedAt: "2026-07-20T00:01:00Z" },
];
const candidate: PostCandidate = {
  id: "c", themeKey: "market:test", title: "市場変動", category: "market_anomaly", summary: "通常より大きな変化", facts: ["前日比-2.5%"], watchNext: "VIX", sourceIds: ["a", "b"], sources, relatedIndicators: ["VIX"], anomalyScore: 80, investorScore: 0,
  viral: { importance: 20, freshness: 15, topicVelocity: 10, japanRelevance: 15, spillover: 10, surprise: 8, forwardInterest: 8, categoryBonus: 20, penalties: 0, total: 100 }, publishedAt: "2026-07-20T00:00:00Z",
};

function dependencies(store: MemoryStore, factPassed = true) {
  return {
    store,
    collect: async () => ({ collectedAt: new Date().toISOString(), indicators: [], markets: [], news: [], newsMode: "mixed", investorSignals: [], socialTrends: [], socialMode: "unavailable" as const }),
    build: () => [candidate],
    write: async () => [0, 1, 2].map((index) => ({ text: `市場が前日比-2.5%。株価だけでなくVIXを確認します。案${index}`, hook_type: "数字", angle: `案${index}`, facts_used: candidate.facts, source_ids: candidate.sourceIds })),
    factCheck: async (draft: { text: string }) => ({ passed: factPassed, risk_score: factPassed ? 5 : 90, issues: factPassed ? [] : ["未確認"], corrected_text: draft.text, verified_source_ids: candidate.sourceIds }),
    edit: async () => ({ selected_index: 0, final_text: "市場が前日比-2.5%。株価だけでなくVIXを確認します。", selection_reason: "事実が明確", viral_score: 80, risk_score: 5 }),
    post: async () => "post-id",
  };
}

test("DRY_RUNでは生成結果を保存するがX投稿しない", async () => {
  const store = new MemoryStore();
  let posted = false;
  const deps = { ...dependencies(store), post: async () => { posted = true; return "id"; } };
  const run = await runAutomationSlot("morning", { manual: true, dependencies: deps });
  assert.equal(run.status, "generated");
  assert.equal(run.dryRun, true);
  assert.equal(posted, false);
  assert.equal(store.state.runs.length, 1);
});

test("ファクトチェック不合格時は投稿停止", async () => {
  const store = new MemoryStore();
  const run = await runAutomationSlot("morning", { manual: true, dependencies: dependencies(store, false) });
  assert.equal(run.status, "failed");
  assert.match(run.error ?? "", /ファクトチェック/);
});

test("同じ投稿枠の二重実行をidempotency keyで防ぐ", async () => {
  const store = new MemoryStore();
  const now = new Date("2026-07-19T22:15:00Z");
  const first = await runAutomationSlot("morning", { now, dependencies: dependencies(store) });
  const second = await runAutomationSlot("morning", { now, dependencies: dependencies(store) });
  assert.equal(first.status, "generated");
  assert.equal(second.status, "skipped");
  assert.match(second.error ?? "", /処理済み/);
});

