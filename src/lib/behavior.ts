import behaviorData from "../../data/crisis-behavior.json";
import type {
  BehaviorSignalItem,
  CrisisBehaviorData,
} from "@/types/behavior";
import type { RiskLevel } from "@/types/indicator";

const data = behaviorData as CrisisBehaviorData;

const riskWeight: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

export function getCrisisBehaviorData() {
  return data;
}

export function getBehaviorOverall(items: BehaviorSignalItem[]) {
  const highest = items.reduce<RiskLevel>(
    (level, item) =>
      riskWeight[item.level] > riskWeight[level] ? item.level : level,
    "green",
  );
  const elevated = items.filter((item) => riskWeight[item.level] > 0).length;

  return {
    level: highest,
    label:
      highest === "red"
        ? "広範な防衛行動"
        : highest === "orange"
          ? "逃避行動が強まる"
          : highest === "yellow"
            ? "一部で慎重化"
            : "通常範囲",
    comment:
      elevated > 0
        ? `${elevated}分野で慎重化や資金逃避の兆候を監視しています。単独ではなく、流動性コアとの同時悪化を重視します。`
        : "人・企業・資金の動きに大きな防衛行動は確認されていません。",
  };
}
