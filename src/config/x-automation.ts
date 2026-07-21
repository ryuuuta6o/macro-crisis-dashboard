import type {
  AutomationSettings,
  GenerationTopic,
  PostingSlot,
} from "@/types/x-automation";

export const GENERATION_TOPICS: Array<{
  id: GenerationTopic;
  label: string;
  description: string;
}> = [
  { id: "all", label: "自動選定", description: "重要度が最も高い材料を横断して選ぶ" },
  { id: "stock_market", label: "株価・指数", description: "日米株、半導体、主要国指数の値動き" },
  { id: "influential_people", label: "著名人・投資家", description: "著名投資家、金融機関、政策当局者の発言・開示" },
  { id: "credit_rates", label: "金利・信用・流動性", description: "国債金利、信用スプレッド、資金市場" },
  { id: "economy_policy", label: "経済・中央銀行", description: "経済指標、政策、中央銀行、地政学ニュース" },
  { id: "fx_commodities_crypto", label: "為替・商品・暗号資産", description: "ドル円、金、原油、Bitcoinなど" },
  { id: "japan_asia", label: "日本・アジア", description: "日本、中国、韓国、台湾と海外市場からの波及" },
];

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

