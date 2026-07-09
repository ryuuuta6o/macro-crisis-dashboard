import type {
  IndicatorValue,
  MarketNewsItem,
  Signal,
  UpdateItem,
  UpdateRadarData,
} from "@/types/indicator";

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const criticalIds = new Set([
  "hy-oas",
  "ig-oas",
  "baa-aaa",
  "sofr",
  "discount-window",
  "bank-deposit-outflow",
  "treasury-auction",
  "fra-ois",
  "ted-spread",
]);

function displayValue(item: IndicatorValue, value: number | string | null) {
  if (value === null) return "データ待ち";
  if (typeof value === "number") return `${value.toFixed(item.decimals)}${item.unit}`;
  return value;
}

function directionFromSignals(previous: Signal, current: Signal): UpdateItem["direction"] {
  if (signalRank[current] > signalRank[previous]) return "worse";
  if (signalRank[current] < signalRank[previous]) return "better";
  return "unchanged";
}

function directionFromValue(item: IndicatorValue): UpdateItem["direction"] {
  if (item.numericValue === null || item.previousNumericValue === null) return "unchanged";
  const change = item.numericValue - item.previousNumericValue;
  if (Math.abs(change) < 10 ** -item.decimals) return "unchanged";
  const higherIsWorse = item.thresholdDirection !== "lower-is-worse";
  const worse = higherIsWorse ? change > 0 : change < 0;
  return worse ? "worse" : "better";
}

function levelFromDirection(direction: UpdateItem["direction"], signal: Signal): UpdateItem["level"] {
  if (direction === "better") return "green";
  if (direction === "new") return signal === "red" ? "red" : signal === "orange" ? "orange" : "yellow";
  if (direction === "worse") {
    if (signal === "red") return "red";
    if (signal === "orange") return "orange";
    return "yellow";
  }
  return signal === "red" ? "red" : signal === "orange" ? "orange" : signal === "yellow" ? "yellow" : "green";
}

function indicatorSummary(item: IndicatorValue, direction: UpdateItem["direction"]) {
  if (item.id === "hy-oas" && item.signal === "green") {
    return "400bp未満。信用市場の第1警報はまだ未点火です。";
  }
  if (criticalIds.has(item.id) && direction === "worse") {
    return `${item.shortName}が悪化。点火層・流動性への波及を確認します。`;
  }
  if (direction === "better") return `${item.shortName}は改善方向。単独では判断せず他の指標と合わせて確認します。`;
  if (direction === "unchanged") return `${item.shortName}は大きな信号変化なし。現在の水準を継続監視します。`;
  return `${item.shortName}が更新されました。`;
}

function indicatorPriority(item: UpdateItem) {
  const critical = item.relatedIndicators?.some((id) => criticalIds.has(id)) ? 40 : 0;
  const direction = item.direction === "worse" ? 50 : item.direction === "new" ? 35 : item.direction === "better" ? 20 : 10;
  const level = item.level === "red" ? 40 : item.level === "orange" ? 30 : item.level === "yellow" ? 20 : 5;
  return critical + direction + level;
}

function buildIndicatorItems(indicators: IndicatorValue[]): UpdateItem[] {
  return indicators.flatMap((item) => {
    const valueUpdated =
      item.value !== null &&
      item.previousValue !== null &&
      String(item.value) !== String(item.previousValue);
    const signalChanged = item.previousSignal !== item.signal;
    if (!valueUpdated && !signalChanged && !criticalIds.has(item.id)) return [];

    const direction = signalChanged
      ? directionFromSignals(item.previousSignal, item.signal)
      : directionFromValue(item);
    const category: UpdateItem["category"] = signalChanged ? "signal_change" : "indicator";
    const update: UpdateItem = {
      id: `indicator-${item.id}`,
      title: item.name,
      category,
      level: levelFromDirection(direction, item.signal),
      direction,
      summary: indicatorSummary(item, direction),
      before: displayValue(item, item.previousValue),
      after: displayValue(item, item.value),
      previousSignal: item.previousSignal,
      currentSignal: item.signal,
      relatedIndicators: [item.id],
      sourceName: item.sourceName ?? item.sourceLabel ?? item.source,
      sourceUrl: item.sourceUrl,
      updatedAt: item.observationDate ?? new Date().toISOString(),
    };
    return [update];
  });
}

function buildNewsItems(news: MarketNewsItem[]): UpdateItem[] {
  return news.slice(0, 3).map((item) => ({
    id: `news-${item.id}`,
    title: item.title,
    category: "news" as const,
    level: item.impactLevel === "red" ? "red" as const : item.impactLevel === "yellow" ? "orange" as const : "green" as const,
    direction: "new" as const,
    summary: item.reason || item.summary || "新着ニュースを確認します。単一ニュースで危機確定とは扱いません。",
    relatedIndicators: item.relatedIndicators,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    updatedAt: item.publishedAt,
  }));
}

function buildManualItems(indicators: IndicatorValue[]): UpdateItem[] {
  return indicators
    .filter((item) => item.source === "manual" || item.source === "published")
    .filter((item) => item.signal === "red" || item.signal === "orange" || criticalIds.has(item.id))
    .slice(0, 5)
    .map((item) => ({
      id: `manual-${item.id}`,
      title: `${item.name} 更新`,
      category: "manual_data" as const,
      level: item.signal === "red" ? "red" as const : item.signal === "orange" ? "orange" as const : item.signal === "yellow" ? "yellow" as const : "green" as const,
      direction: directionFromValue(item),
      summary: item.description,
      before: displayValue(item, item.previousValue),
      after: displayValue(item, item.value),
      previousSignal: item.previousSignal,
      currentSignal: item.signal,
      relatedIndicators: [item.id],
      sourceName: item.sourceName ?? item.sourceLabel ?? item.source,
      sourceUrl: item.sourceUrl,
      updatedAt: item.observationDate ?? new Date().toISOString(),
    }));
}

export function buildUpdateRadarData(
  indicators: IndicatorValue[],
  news: MarketNewsItem[],
  generatedAt = new Date().toISOString(),
): UpdateRadarData {
  const indicatorUpdates = buildIndicatorItems(indicators);
  const newsUpdates = buildNewsItems(news);
  const manualUpdates = buildManualItems(indicators);
  const all = [...indicatorUpdates, ...newsUpdates, ...manualUpdates];
  const highlights = [...all]
    .sort((left, right) => indicatorPriority(right) - indicatorPriority(left))
    .slice(0, 5);

  return {
    generatedAt,
    summary: {
      totalUpdates: all.length,
      worsened: all.filter((item) => item.direction === "worse").length,
      improved: all.filter((item) => item.direction === "better").length,
      newNews: newsUpdates.length,
      manualUpdates: manualUpdates.length,
    },
    highlights,
    indicatorUpdates: indicatorUpdates.slice(0, 8),
    newsUpdates,
    manualUpdates,
  };
}
