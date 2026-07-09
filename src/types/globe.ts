import type { RiskLevel } from "@/types/indicator";
import type { ContagionSignal } from "@/types/contagion-watch";

export type GlobeFocus = "us" | "japan" | "global";

export type GlobeCountryNode = {
  id: string;
  code: string;
  label: string;
  latitude: number;
  longitude: number;
  level: RiskLevel;
};

export type GlobeIndicatorColumn = {
  id: string;
  label: string;
  value: string;
  latitude: number;
  longitude: number;
  level: RiskLevel;
  intensity: number;
  focus: Exclude<GlobeFocus, "global">;
  source: "live_indicator" | "manual_config";
};

export type GlobeFlow = {
  id: string;
  label: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  level: RiskLevel;
};

export type GlobeOrbitNodeData = {
  id: "liquidity" | "rates" | "growth" | "credit";
  subtitle: string;
  value: string;
  level: RiskLevel | "neutral";
};

export type GlobeHeroData = {
  overallLevel: RiskLevel;
  updatedAt: string;
  countries: GlobeCountryNode[];
  columns: GlobeIndicatorColumn[];
  flows: GlobeFlow[];
  orbitNodes: GlobeOrbitNodeData[];
  contagionSignal: ContagionSignal;
};
