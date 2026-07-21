import type {
  AutomationSettings,
  PostingSlot,
} from "@/types/x-automation";

export const POSTING_SLOTS: Record<
  PostingSlot,
  { label: string; hour: number; minute: number; cron: string }
> = {
  morning: { label: "米国市場終了後", hour: 7, minute: 15, cron: "15 22 * * *" },
  midday: { label: "日本・アジア前場後", hour: 12, minute: 10, cron: "10 3 * * *" },
  evening: { label: "米国市場開始前", hour: 21, minute: 30, cron: "30 12 * * *" },
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoPostEnabled: false,
  dryRun: true,
  includeSiteUrl: true,
  requireTwoSources: true,
  schedules: {
    morning: "07:15",
    midday: "12:10",
    evening: "21:30",
  },
  thresholds: {
    equityDailyPercent: 2,
    equityShortPercent: 1,
    vixDailyPercent: 20,
    yieldBasisPoints: 10,
    usdJpyAbsolute: 1.5,
    commodityDailyPercent: 4,
    cryptoDailyPercent: 4,
    zScore: 2,
  },
};

export const MARKET_WATCHLIST = [
  ["nikkei", "日経平均", "^N225", "equity"],
  ["topix", "TOPIX", "^TOPX", "equity"],
  ["sp500", "S&P 500", "^GSPC", "equity"],
  ["nasdaq", "NASDAQ", "^IXIC", "equity"],
  ["sox", "SOX半導体指数", "^SOX", "equity"],
  ["vix-market", "VIX", "^VIX", "vix"],
  ["usd-jpy", "ドル円", "JPY=X", "fx"],
  ["eur-usd", "ユーロドル", "EURUSD=X", "fx"],
  ["gold", "金", "GC=F", "commodity"],
  ["oil", "WTI原油", "CL=F", "commodity"],
  ["bitcoin", "Bitcoin", "BTC-USD", "crypto"],
  ["kospi", "韓国KOSPI", "^KS11", "equity"],
  ["taiwan", "台湾加権", "^TWII", "equity"],
  ["shanghai", "上海総合", "000001.SS", "equity"],
  ["sp-future", "S&P 500先物", "ES=F", "equity"],
  ["nasdaq-future", "NASDAQ先物", "NQ=F", "equity"],
] as const;

export const TRUSTED_INVESTOR_NAMES = [
  "Warren Buffett",
  "Michael Burry",
  "Ray Dalio",
  "Howard Marks",
  "Stanley Druckenmiller",
  "Bill Ackman",
  "Jeremy Grantham",
  "Cathie Wood",
  "Jamie Dimon",
  "Larry Fink",
] as const;

