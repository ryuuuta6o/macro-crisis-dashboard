export type GlobeOrbitConfig = {
  id: string;
  radiusX: number;
  radiusZ: number;
  rotation: [number, number, number];
  phase: number;
};

export type GlobeOrbitNodeConfig = {
  id: "liquidity" | "rates" | "growth" | "credit";
  label: string;
  subtitle: string;
  position: [number, number, number];
};

export const GLOBE_ORBITS: GlobeOrbitConfig[] = [
  {
    id: "funding-orbit",
    radiusX: 2.08,
    radiusZ: 1.78,
    rotation: [0.38, 0.12, 0.18],
    phase: 0,
  },
  {
    id: "rates-orbit",
    radiusX: 2.02,
    radiusZ: 1.86,
    rotation: [-0.5, 0.34, -0.38],
    phase: 0.31,
  },
  {
    id: "growth-orbit",
    radiusX: 2.16,
    radiusZ: 1.72,
    rotation: [0.16, -0.48, 0.58],
    phase: 0.62,
  },
];

export const GLOBE_ORBIT_NODES: GlobeOrbitNodeConfig[] = [
  {
    id: "liquidity",
    label: "LIQUIDITY",
    subtitle: "SYSTEM FLOW",
    position: [1.72, 0.66, 0.66],
  },
  {
    id: "rates",
    label: "RATES",
    subtitle: "US 30Y",
    position: [-1.46, 0.84, 0.92],
  },
  {
    id: "growth",
    label: "GROWTH",
    subtitle: "GLOBAL CYCLE",
    position: [-1.48, -0.86, 0.78],
  },
  {
    id: "credit",
    label: "CREDIT",
    subtitle: "HY OAS",
    position: [1.48, -0.84, 0.92],
  },
];
