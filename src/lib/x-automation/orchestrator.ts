import { randomUUID } from "node:crypto";
import { buildPostCandidates, buildRealtimeSnapshotCandidate } from "@/lib/x-automation/candidates";
import { collectAutomationInput } from "@/lib/x-automation/collector";
import {
  isDuplicateCandidate,
  siteUrlWasUsedToday,
  textSimilarity,
} from "@/lib/x-automation/dedupe";
import {
  factCheckDraft,
  selectEditorialDraft,
  writePostDrafts,
} from "@/lib/x-automation/llm";
import { getSlotScheduledAt, isWithinPostingWindow } from "@/lib/x-automation/schedule";
import { getAutomationStore, type AutomationStore } from "@/lib/x-automation/storage";
import { createXPost } from "@/lib/x-automation/x-client";
import { isValidXText } from "@/lib/x-automation/x-text";
import { filterCandidatesByTopic } from "@/lib/x-automation/topic-filter";
import type {
  AutomationInput,
  AutomationRun,
  EditorialResult,
  FactCheckResult,
  GenerationTopic,
  PostCandidate,
  PostingSlot,
  WriterCandidate,
} from "@/types/x-automation";

const PROHIBITED = [
  "絶対上がる", "必ず下がる", "暴落確定", "急騰確定", "今すぐ買え", "今すぐ売れ",
  "確実に儲かる", "誰でも稼げる", "AIが未来を見抜いた", "著名投資家が予言した",
];

type Dependencies = {
  store: AutomationStore;
  collect: () => Promise<AutomationInput>;
  build: (input: AutomationInput, settings: Awaited<ReturnType<AutomationStore["getState"]>>["settings"]) => PostCandidate[];
  write: typeof writePostDrafts;
  factCheck: typeof factCheckDraft;
  edit: (input: { drafts: WriterCandidate[]; factChecks: FactCheckResult[]; recentPosts: string[] }) => Promise<EditorialResult>;
  post: (text: string) => Promise<string>;
};

const defaultDependencies = (): Dependencies => ({
  store: getAutomationStore(),
  collect: collectAutomationInput,
  build: buildPostCandidates,
  write: writePostDrafts,
  factCheck: factCheckDraft,
  edit: selectEditorialDraft,
  post: createXPost,
});

function emptyRun(slot: PostingSlot, now: Date, idempotencyKey: string, generationTopic: GenerationTopic): AutomationRun {
  const startedAt = now.toISOString();
  return {
    id: randomUUID(),
    idempotencyKey,
    slot,
    generationTopic,
    scheduledAt: getSlotScheduledAt(slot, now),
    startedAt,
    completedAt: startedAt,
    status: "generated",
    dryRun: true,
    candidates: [],
    drafts: [],
    factChecks: [],
    editorial: null,
    finalText: null,
    themeKey: null,
    sources: [],
    postId: null,
    error: null,
    metrics: null,
  };
}

function validationIssue(text: string, recentPosts: string[]) {
  if (!isValidXText(text)) return "Xの加重文字数が280を超えているか、本文が空です。";
  const prohibited = PROHIBITED.find((phrase) => text.includes(phrase));
  if (prohibited) return `禁止表現「${prohibited}」が含まれています。`;
  if (recentPosts.some((post) => textSimilarity(post, text) >= 0.72)) {
    return "直近投稿との類似度が高すぎます。";
  }
  return null;
}

export async function runAutomationSlot(
  slot: PostingSlot,
  options: {
    now?: Date;
    manual?: boolean;
    topic?: GenerationTopic;
    dependencies?: Partial<Dependencies>;
  } = {},
) {
  const now = options.now ?? new Date();
  const generationTopic = options.topic ?? "all";
  const deps = { ...defaultDependencies(), ...options.dependencies } as Dependencies;
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const idempotencyKey = options.manual
    ? `manual:${slot}:${now.toISOString()}`
    : `${dateKey}:${slot}`;
  const run = emptyRun(slot, now, idempotencyKey, generationTopic);

  try {
    if (!options.manual && !isWithinPostingWindow(slot, now)) {
      run.status = "skipped";
      run.error = "投稿予定時刻から45分以上離れているため停止しました。";
      run.completedAt = new Date().toISOString();
      await deps.store.saveRun(run);
      return run;
    }
    if (!(await deps.store.claimIdempotency(idempotencyKey))) {
      run.status = "skipped";
      run.error = "同じ投稿枠はすでに処理済みです。";
      run.completedAt = new Date().toISOString();
      await deps.store.saveRun(run);
      return run;
    }
    const state = await deps.store.getState();
    run.dryRun = state.settings.dryRun;
    const input = await deps.collect();
    const topicalCandidates = filterCandidatesByTopic(deps.build(input, state.settings), generationTopic);
    const fallbackCandidate = topicalCandidates.length === 0
      ? buildRealtimeSnapshotCandidate(input, state.settings, generationTopic)
      : null;
    const candidates = [...topicalCandidates, ...(fallbackCandidate ? [fallbackCandidate] : [])]
      .filter((candidate) => options.manual || !isDuplicateCandidate(candidate, state.runs, now))
      .slice(0, 10);
    run.candidates = candidates;
    run.sources = [...new Map(candidates.flatMap((item) => item.sources).map((source) => [source.id, source])).values()];
    if (candidates.length === 0) {
      throw new Error("選択カテゴリーで、異なる2情報源による確認が取れた最新材料がありません。");
    }

    const recentPosts = state.runs.flatMap((item) => item.finalText ? [item.finalText] : []).slice(0, 10);
    const mayUseSiteUrl = state.settings.includeSiteUrl && !siteUrlWasUsedToday(state.runs, now);
    const drafts = await deps.write(candidates.slice(0, 3), {
      slot,
      recentPosts,
      generationTopic,
      siteUrl: mayUseSiteUrl ? process.env.SITE_URL : undefined,
    });
    run.drafts = drafts;
    const factChecks = await Promise.all(
      drafts.map((draft) => deps.factCheck(draft, candidates.slice(0, 3))),
    );
    run.factChecks = factChecks;
    if (!factChecks.some((check) => check.passed)) {
      throw new Error("すべての投稿案がファクトチェック不合格でした。");
    }
    const editorial = await deps.edit({ drafts, factChecks, recentPosts });
    run.editorial = editorial;
    const selectedCheck = factChecks[editorial.selected_index];
    if (!selectedCheck?.passed) throw new Error("編集長AIが不合格案を選択したため停止しました。");
    let finalText = editorial.final_text.trim();
    if (mayUseSiteUrl && process.env.SITE_URL && !finalText.includes(process.env.SITE_URL)) {
      const withUrl = `${finalText}\n${process.env.SITE_URL}`;
      if (isValidXText(withUrl)) finalText = withUrl;
    }
    const issue = validationIssue(finalText, recentPosts);
    if (issue) throw new Error(issue);
    run.finalText = finalText;
    run.themeKey = candidates[0]?.themeKey ?? null;

    if (!state.settings.dryRun && state.settings.autoPostEnabled) {
      run.postId = await deps.post(finalText);
      run.status = "posted";
    } else {
      run.status = "generated";
    }
  } catch (error) {
    run.status = run.candidates.length === 0 ? "skipped" : "failed";
    run.error = error instanceof Error ? error.message : "Unknown automation error";
  }
  run.completedAt = new Date().toISOString();
  await deps.store.saveRun(run);
  return run;
}

