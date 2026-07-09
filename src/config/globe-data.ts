import type { RiskLevel } from "@/types/indicator";

export const GLOBE_COUNTRY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "united-states": { latitude: 38.9, longitude: -98.5 },
  china: { latitude: 35.9, longitude: 104.2 },
  germany: { latitude: 51.2, longitude: 10.5 },
  japan: { latitude: 36.2, longitude: 138.3 },
  "united-kingdom": { latitude: 55.4, longitude: -3.4 },
  india: { latitude: 20.6, longitude: 79 },
  france: { latitude: 46.2, longitude: 2.2 },
  italy: { latitude: 41.9, longitude: 12.6 },
  russia: { latitude: 61.5, longitude: 105.3 },
  brazil: { latitude: -14.2, longitude: -51.9 },
  canada: { latitude: 56.1, longitude: -106.3 },
  "south-korea": { latitude: 35.9, longitude: 127.8 },
  taiwan: { latitude: 23.7, longitude: 121 },
  "saudi-arabia": { latitude: 23.9, longitude: 45.1 },
  "united-arab-emirates": { latitude: 23.4, longitude: 53.8 },
  israel: { latitude: 31, longitude: 34.9 },
  iran: { latitude: 32.4, longitude: 53.7 },
  egypt: { latitude: 26.8, longitude: 30.8 },
  nigeria: { latitude: 9.1, longitude: 8.7 },
  "south-africa": { latitude: -30.6, longitude: 22.9 },
  mexico: { latitude: 23.6, longitude: -102.5 },
  argentina: { latitude: -38.4, longitude: -63.6 },
  indonesia: { latitude: -0.8, longitude: 113.9 },
  australia: { latitude: -25.3, longitude: 133.8 },
};

// Manual international indicators are intentionally isolated here until a
// stable free official API is available for each series.
export const JAPAN_GLOBE_INDICATORS: Array<{
  id: string;
  label: string;
  value: string;
  latitude: number;
  longitude: number;
  level: RiskLevel;
  intensity: number;
  updatedAt: string;
  sourceName: string;
}> = [
  {
    id: "jpy-carry",
    label: "JPY CARRY",
    value: "巻き戻し警戒",
    latitude: 35.7,
    longitude: 139.7,
    level: "orange",
    intensity: 0.76,
    updatedAt: "2026-06-15",
    sourceName: "Manual config / BOJ market context",
  },
  {
    id: "jgb-yield",
    label: "JGB 10Y",
    value: "金利上昇警戒",
    latitude: 34.7,
    longitude: 135.5,
    level: "orange",
    intensity: 0.7,
    updatedAt: "2026-06-15",
    sourceName: "Manual config / Japan Ministry of Finance",
  },
  {
    id: "boj-policy",
    label: "BOJ POLICY",
    value: "正常化進行",
    latitude: 43.1,
    longitude: 141.4,
    level: "yellow",
    intensity: 0.5,
    updatedAt: "2026-06-15",
    sourceName: "Manual config / Bank of Japan",
  },
];
