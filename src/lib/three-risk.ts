import { formatIndicatorValue } from "@/lib/decision-support";
import { getThreePartRiskComment } from "@/lib/classification";
import type {
  ContagionLink,
  IndicatorId,
  IndicatorValue,
  OverallSignal,
  RiskLevel,
  SafetyValve3DItem,
} from "@/types/indicator";

const includedIds: IndicatorId[] = [
  "hy-oas",
  "baa-aaa",
  "ig-oas",
  "ccc-oas",
  "vix",
  "move",
  "dgs10",
  "dgs30",
  "sofr",
  "office-cmbs",
  "private-credit-default",
];

export function toRiskLevel(
  signal: IndicatorValue["signal"] | OverallSignal,
): RiskLevel {
  if (signal === "crisis" || signal === "red") return "red";
  if (signal === "localized" || signal === "orange") return "orange";
  if (signal === "yellow" || signal === "green-yellow") return "yellow";
  if (signal === "unavailable") return "yellow";
  return "green";
}

export function toSafetyValve3DItems(
  indicators: IndicatorValue[],
): SafetyValve3DItem[] {
  return includedIds.flatMap((id) => {
    const indicator = indicators.find((item) => item.id === id);
    if (!indicator) return [];

    return [
      {
        id,
        name: indicator.name,
        value: formatIndicatorValue(indicator, indicator.value),
        level: toRiskLevel(indicator.signal),
        importance:
          id === "hy-oas"
            ? "SSS"
            : id === "baa-aaa"
              ? "SS"
              : indicator.importance === "critical"
                ? "SS"
                : indicator.importance === "important"
                  ? "S"
                  : indicator.importance === "ignition"
                    ? "A"
                    : "B",
        category: indicator.category,
        change:
          indicator.numericValue === null ||
          indicator.previousNumericValue === null
            ? null
            : indicator.numericValue - indicator.previousNumericValue,
      },
    ];
  });
}

export function getContagionLinks(
  items: SafetyValve3DItem[],
): ContagionLink[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const links: ContagionLink[] = [];
  const addLink = (
    from: IndicatorId,
    to: IndicatorId,
    fallback: RiskLevel,
  ) => {
    const source = byId.get(from);
    const target = byId.get(to);
    if (!source || !target) return;
    if (
      source.level === "red" ||
      source.level === "orange" ||
      source.level === "yellow" ||
      (source.change !== null && source.change > 0)
    ) {
      links.push({
        from,
        to,
        level:
          source.level === "red"
            ? "red"
            : source.level === "orange"
              ? "orange"
              : fallback,
      });
    }
  };

  addLink("office-cmbs", "private-credit-default", "yellow");
  addLink("private-credit-default", "hy-oas", "yellow");
  addLink("ccc-oas", "hy-oas", "yellow");
  addLink("hy-oas", "ig-oas", "yellow");
  addLink("ig-oas", "baa-aaa", "yellow");
  addLink("vix", "hy-oas", "yellow");
  addLink("move", "dgs10", "yellow");
  addLink("dgs30", "dgs10", "yellow");
  addLink("sofr", "hy-oas", "orange");

  return links;
}

export function getRiskComment(
  indicators: IndicatorValue[],
): string {
  return getThreePartRiskComment(indicators);
}
