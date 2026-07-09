import type {
  CoreIndicatorType,
  IndicatorValue,
  Signal,
} from "@/types/indicator";

export type ClassificationSummary = {
  type: CoreIndicatorType;
  title: string;
  status: string;
  signal: Signal;
  comment: string;
  alertCount: number;
  availableCount: number;
  totalCount: number;
};

const typeOrder: CoreIndicatorType[] = [
  "safety_valve",
  "warning_signal",
  "vulnerability",
];

function summarizeSignal(items: IndicatorValue[]): Signal {
  const available = items.filter((item) => item.signal !== "unavailable");
  if (available.length === 0) return "unavailable";
  if (available.some((item) => item.signal === "red")) return "red";
  if (available.some((item) => item.signal === "orange")) return "orange";
  if (available.some((item) => item.signal === "yellow")) return "yellow";
  return "green";
}

export function getClassificationSummaries(
  indicators: IndicatorValue[],
): ClassificationSummary[] {
  return typeOrder.map((type) => {
    const items = indicators.filter((item) => item.type === type);
    const signal = summarizeSignal(items);
    const alertCount = items.filter(
      (item) =>
        item.signal === "yellow" ||
        item.signal === "orange" ||
        item.signal === "red",
    ).length;
    const availableCount = items.filter(
      (item) => item.signal !== "unavailable",
    ).length;

    if (type === "safety_valve") {
      return {
        type,
        title: "安全弁",
        status:
          signal === "red"
            ? "機能低下"
            : signal === "orange"
              ? "強い注意"
            : signal === "yellow"
              ? "要注意"
              : signal === "unavailable"
                ? "判定待ち"
                : "機能中",
        signal,
        comment:
          signal === "red"
            ? "信用・流動性・銀行資本の一部で点火防止機能が低下しています"
            : signal === "orange"
              ? "信用・流動性・銀行資本の一部で強い注意が必要です"
            : signal === "yellow"
              ? "信用・流動性・銀行資本に注意が必要な変化があります"
              : signal === "unavailable"
                ? "主要な安全弁データの更新を待っています"
                : "信用・流動性・銀行資本はまだ持ちこたえています",
        alertCount,
        availableCount,
        totalCount: items.length,
      };
    }

    if (type === "warning_signal") {
      return {
        type,
        title: "警告サイン",
        status:
          signal === "red"
            ? "強く点灯"
            : signal === "orange"
              ? "強めに点灯"
            : signal === "yellow"
              ? "点灯中"
              : signal === "unavailable"
                ? "判定待ち"
                : "静穏",
        signal,
        comment:
          signal === "red"
            ? "市場ボラティリティ、金利、雇用の警告が強まっています"
            : signal === "orange"
              ? "市場ボラティリティ、金利、雇用の警告が強まりつつあります"
            : signal === "yellow"
              ? "VIX、雇用、金利などに注意が必要です"
              : signal === "unavailable"
                ? "警告センサーのデータ更新を待っています"
                : "危機接近を示す主要センサーは落ち着いています",
        alertCount,
        availableCount,
        totalCount: items.length,
      };
    }

    return {
      type,
      title: "脆弱性",
      status:
        signal === "red"
          ? "高リスク"
          : signal === "orange"
            ? "警戒"
          : signal === "yellow"
            ? "蓄積中"
            : signal === "unavailable"
              ? "判定待ち"
              : "抑制的",
      signal,
        comment:
        signal === "red"
          ? "CRE、Private Credit、株式バリュエーション、Margin Debt / M2が危機時の破壊力を高めています"
          : signal === "orange"
            ? "CRE、Private Credit、株式市場の割高感など、損失を増幅する要因に警戒が必要です"
          : signal === "yellow"
            ? "点火時の損失を増幅する要因が蓄積しています"
            : signal === "unavailable"
              ? "脆弱性データの更新を待っています"
              : "現時点で大きな損失増幅要因は限定的です",
      alertCount,
      availableCount,
      totalCount: items.length,
    };
  });
}

export function getThreePartRiskComment(
  indicators: IndicatorValue[],
): string {
  const summaries = getClassificationSummaries(indicators);
  const byType = new Map(summaries.map((item) => [item.type, item]));
  const safety = byType.get("safety_valve")!;
  const warning = byType.get("warning_signal")!;
  const vulnerability = byType.get("vulnerability")!;
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const creditValvesGreen =
    byId.get("hy-oas")?.signal === "green" &&
    byId.get("baa-aaa")?.signal === "green";
  const vulnerableNames = indicators
    .filter(
      (item) =>
        item.type === "vulnerability" &&
        (item.signal === "red" ||
          item.signal === "orange" ||
          item.signal === "yellow"),
    )
    .slice(0, 2)
    .map((item) => item.name);

  if (safety.signal === "red" && vulnerability.signal === "red") {
    return "安全弁が赤に転じています。現在の大きな脆弱性が金融危機へ発展する可能性に注意が必要です。";
  }

  if (creditValvesGreen && vulnerableNames.length > 0) {
    return `HY OASとBAA-AAAが緑のため、信用市場全体への延焼はまだ確認されていません。一方で${vulnerableNames.join("と")}は高リスクです。`;
  }

  const safetyText =
    safety.signal === "green"
      ? "安全弁はまだ機能しています"
      : safety.signal === "yellow"
        ? "安全弁の一部に注意が必要です"
        : safety.signal === "orange"
          ? "安全弁の一部で強い注意が必要です"
          : safety.signal === "red"
            ? "安全弁の一部が機能低下しています"
            : "安全弁は判定待ちです";
  const warningText =
    warning.signal === "green"
      ? "警告サインは落ち着いています"
      : warning.signal === "yellow"
        ? "警告サインが点き始めています"
        : warning.signal === "orange"
          ? "警告サインが強まりつつあります"
          : warning.signal === "red"
            ? "警告サインが強く点灯しています"
            : "警告サインは判定待ちです";
  const vulnerabilityText =
    vulnerability.signal === "green"
      ? "脆弱性は抑制的です"
      : vulnerability.signal === "yellow"
        ? "脆弱性は蓄積しています"
        : vulnerability.signal === "orange"
          ? "脆弱性は警戒水準です"
          : vulnerability.signal === "red"
            ? "脆弱性は高い状態です"
            : "脆弱性は判定待ちです";

  return `${safetyText}が、${warningText}。${vulnerabilityText}。`;
}
