import type { RiskLevel } from "@/types/indicator";

export type BehaviorSignalId =
  | "smart-money"
  | "insider-selling"
  | "escape-money"
  | "credit-escape"
  | "corporate-defense"
  | "policy-stress";

export type BehaviorSignalItem = {
  id: BehaviorSignalId;
  name: string;
  japaneseName: string;
  level: RiskLevel;
  summary: string;
  explanation: string;
  caution: string;
  evidence: string[];
  sourceType: "manual";
  sourceUrls: string[];
};

export type CrisisBehaviorData = {
  updatedAt: string;
  items: BehaviorSignalItem[];
};
