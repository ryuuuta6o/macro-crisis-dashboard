import type { SectorCompanyGrowthData } from "@/types/sector-momentum";

export type ManualCompanyFinancialOverride = Partial<
  Pick<
    SectorCompanyGrowthData,
    | "orders"
    | "ordersLabel"
    | "backlog"
    | "backlogLabel"
    | "backlogGrowth"
    | "analystCoverage"
    | "institutionalOwnership"
    | "shortInterest"
    | "updatedAt"
  >
> & {
  sourceName: string;
  sourceUrl?: string;
};

/*
 * Orders and backlog are not standardized in FMP financial statements.
 * Add company-reported values here only when the source and update date
 * have been verified. Unknown values remain unavailable.
 */
export const manualCompanyFinancials: Record<string, ManualCompanyFinancialOverride> = {};
