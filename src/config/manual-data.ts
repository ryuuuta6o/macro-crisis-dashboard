export const CONTAGION_WATCH_CONFIG = {
  bankNonbankCredit: {
    primarySeriesId: "LNFACBW027SBOG",
    fallbackSeriesId: "BUSLOANS",
    highBalancePercentile: 0.9,
    warningYoyGrowthPct: 5,
    dangerYoyGrowthPct: 10,
  },
  bdcNonAccrual: {
    // Manual placeholder based on aggregate BDC filings. Replace after reviewing
    // the latest quarterly filings and update the observation date and source.
    valuePct: 3.5,
    previousValuePct: 3.2,
    observationDate: "2026-06-20",
    sourceName: "Manual aggregate of public BDC filings",
    sourceUrl: "https://www.sec.gov/edgar/search/",
    updateFrequency: "四半期・決算公表後に手動更新",
    greenBelowPct: 3,
    redAbovePct: 5,
  },
  privateCreditFundMarkdown: {
    // Manual placeholder for large evergreen private-credit fund NAV reports.
    // A second consecutive negative month changes this indicator to red.
    currentNavChangePct: -0.2,
    previousNavChangePct: 0.1,
    observationDate: "2026-06-20",
    sourceName: "Manual review of large private-credit fund reports",
    sourceUrl: "https://www.bcred.com/",
    updateFrequency: "月次報告公表後に手動更新",
  },
} as const;

export const MARGIN_DEBT_M2_CONFIG = {
  m2SeriesId: "M2SL",
  sourceName: "FINRA Margin Statistics + FRED M2SL",
  sourceUrl:
    "https://www.finra.org/rules-guidance/key-topics/margin-accounts/margin-statistics",
  m2SourceUrl: "https://fred.stlouisfed.org/series/M2SL",
  updateFrequency: "FINRA月次公表後に手動更新 / M2はFRED自動取得",
  itBubblePeakPct: 6.35,
  lehmanPeakPct: 5.73,
  peakoutMinimumDropPctPoint: 0.15,
  marginDebtHistory: [
    // FINRA margin debt is monthly and normally published with about a one-month lag.
    // Unit: USD millions. Update this block after each FINRA monthly publication.
    {
      date: "2026-05-31",
      marginDebtMillionUsd: 1_420_000,
      sourceNote: "Default placeholder requested by user: May 2026, USD 1.42T",
    },
    { date: "2026-04-30", marginDebtMillionUsd: 1_382_000 },
    { date: "2026-03-31", marginDebtMillionUsd: 1_337_000 },
    { date: "2026-02-28", marginDebtMillionUsd: 1_296_000 },
    { date: "2026-01-31", marginDebtMillionUsd: 1_262_000 },
    { date: "2025-12-31", marginDebtMillionUsd: 1_225_000 },
    { date: "2025-11-30", marginDebtMillionUsd: 1_198_000 },
    { date: "2025-10-31", marginDebtMillionUsd: 1_176_000 },
    { date: "2025-09-30", marginDebtMillionUsd: 1_154_000 },
    { date: "2025-08-31", marginDebtMillionUsd: 1_132_000 },
    { date: "2025-07-31", marginDebtMillionUsd: 1_105_000 },
    { date: "2025-06-30", marginDebtMillionUsd: 1_082_000 },
  ],
} as const;

export const BUBBLE_TRIGGER_CONFIG = {
  dotcom: {
    fedPolicy: {
      stance: "hold" as "easing" | "hold" | "hike-watch" | "hiking",
      label: "政策金利は高止まりだが、明確な再利上げ転換は未確認",
      observationDate: "2026-06-24",
      sourceName: "Manual Fed policy stance review",
      sourceUrl: "https://www.federalreserve.gov/monetarypolicy.htm",
      updateFrequency: "FOMC・議事要旨・FRB発言確認後に手動更新",
    },
    techConcentration: {
      valuePct: 39,
      previousValuePct: 38.5,
      observationDate: "2026-06-24",
      sourceName: "Manual S&P 500 sector concentration estimate",
      sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
      updateFrequency: "月次・四半期確認",
      warningPct: 35,
      redPct: 45,
    },
    momentum: {
      above50Day: true,
      above200Day: true,
      observationDate: "2026-06-24",
      sourceName: "Manual S&P 500 momentum review",
      sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
      updateFrequency: "市場営業日・手動確認",
    },
  },
  credit: {
    hyOasWarningBp: 400,
    hyOasSystemicBp: 800,
    systemicThresholdSourceName: "Bank of England SWES 2026 private markets stress scenario",
    systemicThresholdSourceUrl:
      "https://www.bankofengland.co.uk/financial-stability/market-wide-exploratory-scenario",
  },
} as const;

export const NFP_REVISION_CONFIG = {
  valueK: -180,
  previousValueK: -90,
  observationDate: "2026-06-07",
  sourceName: "Manual BLS employment revision review",
  sourceUrl: "https://www.bls.gov/ces/",
  updateFrequency: "雇用統計公表・年次ベンチマーク改定後に手動更新",
  watchAtK: -100,
  metAtK: -250,
} as const;

export const ENERGY_CREDIT_ROUTE_CONFIG = {
  oilVsShaleBreakeven: {
    oilPriceUsd: 64,
    previousOilPriceUsd: 68,
    shaleBreakevenLowUsd: 50,
    shaleBreakevenHighUsd: 60,
    observationDate: "2026-06-24",
    sourceName: "Manual WTI vs shale breakeven review",
    sourceUrl: "https://www.eia.gov/petroleum/",
    updateFrequency: "市場営業日・手動確認",
  },
  energyHySpread: {
    valueBp: 420,
    previousValueBp: 390,
    observationDate: "2026-06-24",
    sourceName: "Manual energy HY spread review",
    sourceUrl: "https://fred.stlouisfed.org/",
    updateFrequency: "週次・月次確認",
    warningBp: 500,
    redBp: 700,
  },
} as const;
