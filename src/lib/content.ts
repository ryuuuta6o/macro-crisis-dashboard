import manualData from "@/data/manual-indicators.json";
import similarPeriodsData from "@/data/similar-periods.json";
import type {
  AssetTemperature,
  SimilarPeriod,
} from "@/types/indicator";

type ManualContent = {
  _assetTemperatures?: Record<string, AssetTemperature>;
};

export const similarPeriods = similarPeriodsData as SimilarPeriod[];
export const assetTemperatures = Object.values(
  (manualData as ManualContent)._assetTemperatures ?? {},
);
