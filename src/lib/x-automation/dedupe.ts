import type { AutomationRun, PostCandidate } from "@/types/x-automation";

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1),
  );
}

export function textSimilarity(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function hasNewFacts(candidate: PostCandidate, previous: AutomationRun) {
  const oldFacts = new Set(
    previous.candidates.flatMap((item) => item.facts.map((fact) => fact.toLowerCase())),
  );
  return candidate.facts.some((fact) => !oldFacts.has(fact.toLowerCase()));
}

export function isDuplicateCandidate(
  candidate: PostCandidate,
  history: AutomationRun[],
  now = new Date(),
) {
  return history.some((run) => {
    const completedAt = new Date(run.completedAt);
    const within24Hours = now.getTime() - completedAt.getTime() <= 86_400_000;
    if (!within24Hours || !run.finalText) return false;
    const sameTheme = run.themeKey === candidate.themeKey;
    const similar = textSimilarity(run.finalText, `${candidate.title} ${candidate.summary}`) >= 0.62;
    return (sameTheme || similar) && !hasNewFacts(candidate, run);
  });
}

export function siteUrlWasUsedToday(runs: AutomationRun[], now = new Date()) {
  const jstDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return runs.some((run) => {
    if (!run.finalText || !/https?:\/\//.test(run.finalText)) return false;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(run.completedAt)) === jstDate;
  });
}

