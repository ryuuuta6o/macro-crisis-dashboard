import type { Signal } from "@/types/indicator";

export type ContagionSignal = Extract<
  Signal,
  "green" | "yellow" | "red" | "unavailable"
>;

export type ContagionTrend = "rising" | "stable" | "falling" | "unavailable";

export type ContagionIndicatorId =
  | "bank-nonbank-credit"
  | "bdc-non-accrual"
  | "pc-fund-markdown"
  | "pc-redemption-pressure"
  | "pc-asset-sale"
  | "owl-market-signal"
  | "arcc-nav-discount"
  | "obdc-nav-discount"
  | "fsk-nav-discount"
  | "bxsl-nav-discount"
  | "hy-oas-spillover";

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

export type PrivateCreditLiquidityState =
  | "normal"
  | "liquidity-run"
  | "credit-spillover"
  | "unavailable";

export type PrivateCreditLiquidityData = {
  state: PrivateCreditLiquidityState;
  liquiditySignal: ContagionSignal;
  liquidityStatus: string;
  creditSignal: ContagionSignal;
  creditStatus: string;
  description: string;
  indicators: ContagionIndicator[];
  bdcDiscounts: ContagionIndicator[];
  creditDeteriorationConfirmed: boolean;
};

export type ContagionWatchData = {
  state: ContagionWatchState;
  signal: ContagionSignal;
  status: string;
  description: string;
  indicators: ContagionIndicator[];
  privateCreditLiquidity: PrivateCreditLiquidityData;
  deterioratingCount: number;
  ignitionPrecursor: boolean;
  fetchedAt: string;
};
