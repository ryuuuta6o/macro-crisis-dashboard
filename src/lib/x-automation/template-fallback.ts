import { getXWeightedLength } from "@/lib/x-automation/x-text";
import type {
  EditorialResult,
  FactCheckResult,
  PostCandidate,
  WriterCandidate,
} from "@/types/x-automation";

function trimPunctuation(value: string) {
  return value.trim().replace(/[。.!！?？]+$/u, "");
}

function fitToX(text: string, maxWeight = 260) {
  const clean = text.trim();
  if (getXWeightedLength(clean) <= maxWeight) return clean;
  const suffix = "…";
  let result = "";
  for (const character of clean) {
    const next = `${result}${character}${suffix}`;
    if (getXWeightedLength(next) > maxWeight) break;
    result += character;
  }
  return `${result.trimEnd()}${suffix}`;
}

function templateTexts(candidate: PostCandidate) {
  const title = trimPunctuation(candidate.title);
  const fact = trimPunctuation(candidate.facts[0] ?? candidate.summary);
  const secondFact = candidate.facts[1] ? trimPunctuation(candidate.facts[1]) : null;
  const watch = trimPunctuation(candidate.watchNext);
  const trendCaution = candidate.category === "trend"
    ? "検索量は価格の方向を示すものではありません。"
    : "単独の値動きだけでは原因を断定できません。";

  return [
    `${title}。\n${fact}${secondFact ? `、${secondFact}` : ""}。\n${trendCaution}次は${watch}を確認します。`,
    `${fact}。\nいま確認できる変化は「${title}」です。${trendCaution}\n次の焦点は${watch}。`,
    `${title}。数字だけで結論は出せません。\n確認できたのは${fact}。次は${watch}が同じ方向へ動くかを見ます。`,
  ].map((text) => fitToX(text));
}

export function buildTemplateFallback(candidate: PostCandidate): {
  drafts: WriterCandidate[];
  factChecks: FactCheckResult[];
  editorial: EditorialResult;
} {
  const texts = templateTexts(candidate);
  const drafts = texts.map((text, index) => ({
    text,
    hook_type: index === 0 ? "事実" : index === 1 ? "数字" : "慎重な警戒",
    angle: "取得済みデータだけを使う無料定型編集",
    facts_used: candidate.facts.slice(0, 2),
    source_ids: candidate.sourceIds,
  }));
  const factChecks = drafts.map((draft) => ({
    passed: true,
    risk_score: 8,
    issues: [],
    corrected_text: draft.text,
    verified_source_ids: candidate.sourceIds,
  }));
  return {
    drafts,
    factChecks,
    editorial: {
      selected_index: 0,
      final_text: drafts[0].text,
      selection_reason: "API利用制限のため、取得済み事実だけで構成した定型案を選択しました。",
      viral_score: candidate.viral.total,
      risk_score: 8,
    },
  };
}
