import type { Signal } from "@/types/indicator";

export type ContagionSignal = Extract<
  Signal,
  "green" | "yellow" | "red" | "unavailable"
>;

export type ContagionTrend = "rising" | "stable" | "falling" | "unavailable";

export type ContagionIndicatorId =
  | "bank-nonbank-credit"
  | "bdc-non-accrual"
  | "pc-fund-markdown";

export type ContagionIndicator = {
  id: ContagionIndicatorId;
  name: string;
  shortName: string;
  valueLabel: string;
  secondaryLabel: string;
  signal: ContagionSignal;
  trend: ContagionTrend;
  trendLabel: string;
  thresholdLabel: string;
  markerPercent: number;
  sourceName: string;
  sourceUrl?: string;
  observationDate: string | null;
  updateFrequency: string;
  note: string;
};

export type ContagionWatchState =
  | "slow-burn"
  | "seepage"
  | "phase-transition"
  | "unavailable";

export type ContagionWatchData = {
  state: ContagionWatchState;
  signal: ContagionSignal;
  status: string;
  description: string;
  indicators: ContagionIndicator[];
  deterioratingCount: number;
  ignitionPrecursor: boolean;
  fetchedAt: string;
};
