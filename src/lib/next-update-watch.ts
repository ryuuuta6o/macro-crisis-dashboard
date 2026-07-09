import scheduleData from "@/data/update-schedule.json";
import type {
  IndicatorValue,
  IndicatorId,
  NextUpdateWatchData,
  Signal,
  UpdateScheduleItem,
} from "@/types/indicator";

const importanceRank: Record<UpdateScheduleItem["importance"], number> = {
  SSS: 5,
  SS: 4,
  S: 3,
  A: 2,
  B: 1,
};

const ignitionBonusCategories = new Set([
  "credit",
  "liquidity",
  "rates",
  "employment",
  "central_bank",
]);

function parseExpectedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRemaining(expectedAt: string, now: Date) {
  const expected = parseExpectedAt(expectedAt);
  if (!expected) {
    if (expectedAt === "manual") return "手動更新予定";
    if (expectedAt === "event") return "イベント待ち";
    if (expectedAt === "next-business-day") return "次回営業日";
    return "予定確認中";
  }
  const diffMs = expected.getTime() - now.getTime();
  if (diffMs <= 0) return "予定時刻を通過";
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `あと${days}日`;
  if (hours >= 1) return `あと${hours}時間`;
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  return `あと${minutes}分`;
}

function dateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function resolveStatus(
  item: UpdateScheduleItem,
  indicator: IndicatorValue | undefined,
  now: Date,
): UpdateScheduleItem["status"] {
  if (item.status === "unavailable") return "unavailable";
  if (item.expectedAt === "manual" || item.expectedAt === "event" || item.expectedAt === "next-business-day") {
    if (!indicator) return item.status;
    const observed = dateOnly(indicator.observationDate);
    const today = now.toISOString().slice(0, 10);
    return observed === today ? "updated" : item.status;
  }

  const expected = parseExpectedAt(item.expectedAt);
  if (!expected) return item.status;
  if (now.getTime() <= expected.getTime()) return "upcoming";
  if (!indicator) return "delayed";
  const observed = dateOnly(indicator.observationDate);
  const expectedDate = expected.toISOString().slice(0, 10);
  return observed && observed >= expectedDate ? "updated" : "delayed";
}

function itemScore(item: UpdateScheduleItem, now: Date) {
  const expected = parseExpectedAt(item.expectedAt);
  const distanceScore = expected
    ? Math.max(0, 10_000_000_000 - Math.abs(expected.getTime() - now.getTime())) / 10_000_000_000
    : item.expectedAt === "next-business-day" ? 0.75 : item.expectedAt === "event" ? 0.55 : 0.35;
  return (
    importanceRank[item.importance] * 100 +
    distanceScore * 20 +
    (ignitionBonusCategories.has(item.category) ? 10 : 0) +
    (item.updateFrequency === "manual" ? 2 : 0)
  );
}

export function buildNextUpdateWatchData(
  indicators: IndicatorValue[],
  now = new Date(),
): NextUpdateWatchData {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const items = (scheduleData as UpdateScheduleItem[]).map((item) => {
    const indicator = item.indicatorId ? byId.get(item.indicatorId as IndicatorId) : undefined;
    const status = resolveStatus(item, indicator, now);
    const remainingLabel = formatRemaining(item.expectedAt, now);
    return {
      ...item,
      status,
      remainingLabel,
      currentSignal: indicator?.signal ?? "unavailable" as Signal,
      observationDate: indicator?.observationDate ?? null,
    };
  });

  return {
    generatedAt: now.toISOString(),
    nextItems: items
      .filter((item) => item.status === "upcoming" || item.status === "delayed" || item.status === "unavailable")
      .sort((left, right) => itemScore(right, now) - itemScore(left, now))
      .slice(0, 3),
  };
}

export type NextUpdateWatchItem = ReturnType<typeof buildNextUpdateWatchData>["nextItems"][number];
