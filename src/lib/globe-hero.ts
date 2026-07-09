import {
  GLOBE_COUNTRY_COORDINATES,
  JAPAN_GLOBE_INDICATORS,
} from "@/config/globe-data";
import { formatIndicatorValue } from "@/lib/decision-support";
import { toRiskLevel } from "@/lib/three-risk";
import type { GlobalRiskData } from "@/types/global-risk";
import type {
  GlobeHeroData,
  GlobeIndicatorColumn,
  GlobeOrbitNodeData,
} from "@/types/globe";
import type { ContagionSignal } from "@/types/contagion-watch";
import type {
  IndicatorId,
  IndicatorValue,
  RiskLevel,
} from "@/types/indicator";

const liveColumnDefinitions: Array<{
  id: IndicatorId;
  label: string;
  latitude: number;
  longitude: number;
  redReference: number;
}> = [
  {
    id: "hy-oas",
    label: "HY OAS",
    latitude: 40.7,
    longitude: -74,
    redReference: 600,
  },
  {
    id: "vix",
    label: "VIX",
    latitude: 41.9,
    longitude: -87.6,
    redReference: 40,
  },
  {
    id: "dgs30",
    label: "US 30Y",
    latitude: 38.9,
    longitude: -77,
    redReference: 6,
  },
];

const riskWeight: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

export function buildGlobeHeroData(
  indicators: IndicatorValue[],
  globalRisk: GlobalRiskData,
  overallLevel: RiskLevel,
  updatedAt: string,
  contagionSignal: ContagionSignal,
): GlobeHeroData {
  const countries = globalRisk.regions.flatMap((region) => {
    const coordinates = GLOBE_COUNTRY_COORDINATES[region.id];
    if (!coordinates) return [];
    return [
      {
        id: region.id,
        code: region.code,
        label: region.japaneseName,
        level: region.level,
        ...coordinates,
      },
    ];
  });

  const liveColumns = liveColumnDefinitions.flatMap<GlobeIndicatorColumn>(
    (definition) => {
      const indicator = indicators.find((item) => item.id === definition.id);
      if (!indicator) return [];
      const rawIntensity =
        indicator.numericValue === null
          ? 0.3
          : Math.abs(indicator.numericValue) / definition.redReference;
      return [
        {
          id: definition.id,
          label: definition.label,
          value: formatIndicatorValue(indicator, indicator.value),
          latitude: definition.latitude,
          longitude: definition.longitude,
          level: toRiskLevel(indicator.signal),
          intensity: clamp(rawIntensity, 0.24, 1),
          focus: "us",
          source: "live_indicator",
        },
      ];
    },
  );

  const manualColumns: GlobeIndicatorColumn[] = JAPAN_GLOBE_INDICATORS.map(
    (item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      latitude: item.latitude,
      longitude: item.longitude,
      level: item.level,
      intensity: item.intensity,
      focus: "japan",
      source: "manual_config",
    }),
  );

  const globalLevel = countries.reduce<RiskLevel>(
    (highest, country) =>
      riskWeight[country.level] > riskWeight[highest]
        ? country.level
        : highest,
    overallLevel,
  );

  return {
    overallLevel: globalLevel,
    updatedAt,
    countries,
    columns: [...liveColumns, ...manualColumns],
    flows: [
      {
        id: "yen-carry-us-japan",
        label: "YEN CARRY FLOW",
        from: { latitude: 35.7, longitude: 139.7 },
        to: { latitude: 40.7, longitude: -74 },
        level: "orange",
      },
    ],
    orbitNodes: buildOrbitNodes(indicators),
    contagionSignal,
  };
}

function buildOrbitNodes(indicators: IndicatorValue[]): GlobeOrbitNodeData[] {
  const liquidityIds: IndicatorId[] = [
    "sofr",
    "ted-spread",
    "fra-ois",
    "bank-deposit-outflow",
    "mmf-assets",
    "discount-window",
  ];
  const liquidityIndicators = indicators.filter(
    (indicator) =>
      liquidityIds.includes(indicator.id) && indicator.signal !== "unavailable",
  );
  const liquidityAlertCount = liquidityIndicators.filter(
    (indicator) => indicator.signal !== "green",
  ).length;
  const liquidityLevel = highestIndicatorLevel(liquidityIndicators);
  const rates = indicators.find((indicator) => indicator.id === "dgs30");
  const growth = indicators.find((indicator) => indicator.id === "icsa");
  const credit = indicators.find((indicator) => indicator.id === "hy-oas");

  return [
    {
      id: "liquidity",
      subtitle: "FUNDING CORE",
      value:
        liquidityIndicators.length === 0
          ? "NO DATA"
          : liquidityAlertCount === 0
            ? "STABLE"
            : `${liquidityAlertCount} ALERTS`,
      level: liquidityLevel,
    },
    indicatorOrbitNode("rates", "US 30Y", rates),
    indicatorOrbitNode("growth", "JOBLESS", growth),
    indicatorOrbitNode("credit", "HY OAS", credit),
  ];
}

function indicatorOrbitNode(
  id: GlobeOrbitNodeData["id"],
  subtitle: string,
  indicator: IndicatorValue | undefined,
): GlobeOrbitNodeData {
  if (!indicator || indicator.signal === "unavailable") {
    return { id, subtitle, value: "NO DATA", level: "neutral" };
  }
  return {
    id,
    subtitle,
    value: formatIndicatorValue(indicator, indicator.value),
    level: toRiskLevel(indicator.signal),
  };
}

function highestIndicatorLevel(
  indicators: IndicatorValue[],
): GlobeOrbitNodeData["level"] {
  if (indicators.length === 0) return "neutral";
  return indicators.reduce<RiskLevel>((highest, indicator) => {
    const level = toRiskLevel(indicator.signal);
    return riskWeight[level] > riskWeight[highest] ? level : highest;
  }, "green");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
