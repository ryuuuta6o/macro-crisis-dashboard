export type SmartMoneyStance = "攻め" | "中立" | "守り" | "判断保留";

export type PositionChangeType =
  | "新規"
  | "買い増し"
  | "継続"
  | "小幅変更"
  | "減少"
  | "全売却";

export type SmartMoneyPosition = {
  ticker: string | null;
  cusip: string;
  company: string;
  securityClass: string;
  optionType: string | null;
  shareType: string;
  previousShares: number;
  currentShares: number;
  previousValue: number;
  currentValue: number;
  changePercent: number | null;
  changeType: PositionChangeType;
  portfolioWeight: number;
  source: string;
  sourceUrl: string;
  note: string;
};

export type SmartMoneyInvestor = {
  priority: number;
  slug: string;
  investor: string;
  firm: string;
  cik: string;
  trackingReason: string;
  period: string;
  previousPeriod: string;
  filingDate: string;
  dataStatus: "live" | "unavailable";
  statusMessage: string | null;
  stance: SmartMoneyStance;
  topIncreases: string[];
  topDecreases: string[];
  summary: string;
  totalValue: number;
  positionCount: number;
  sourceUrl: string | null;
  positions: SmartMoneyPosition[];
};

export type SmartMoneyFiler = {
  priority: number;
  slug: string;
  investor: string;
  firm: string;
  cik: string;
  trackingReason: string;
  disclosureNote?: string;
};
