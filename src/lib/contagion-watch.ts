import { CONTAGION_WATCH_CONFIG } from "@/config/manual-data";
import { fetchFredSeries, type NumericObservation } from "@/lib/fred";
import type {
  ContagionIndicator,
  ContagionSignal,
  ContagionTrend,
  ContagionWatchData,
  PrivateCreditLiquidityData,
} from "@/types/contagion-watch";

const FRED_SERIES_URL = "https://fred.stlouisfed.org/series/";

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const signalRank: Record<ContagionSignal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  red: 2,
};

function percentChange(current: number, previous: number) {
  return previous === 0 ? 0 : ((current - previous) / previous) * 100;
}

function trendFromValues(current: number, previous: number): ContagionTrend {
  const change = current - previous;
  const tolerance = Math.max(Math.abs(previous) * 0.001, 0.01);
  if (change > tolerance) return "rising";
  if (change < -tolerance) return "falling";
  return "stable";
}

function trendLabel(trend: ContagionTrend) {
  if (trend === "rising") return "上昇中";
  if (trend === "falling") return "低下中";
  if (trend === "stable") return "横ばい";
  return "取得不可";
}

function strongestSignal(indicators: ContagionIndicator[]) {
  return indicators.reduce<ContagionSignal>(
    (strongest, item) =>
      signalRank[item.signal] > signalRank[strongest]
        ? item.signal
        : strongest,
    "unavailable",
  );
}

export function getRedemptionPressureSignal(
  requestPct: number,
  capPct: number,
  warningMultiple: number,
  redMultiple: number,
): ContagionSignal {
  if (capPct <= 0) return "unavailable";
  const multiple = requestPct / capPct;
  if (multiple >= redMultiple) return "red";
  if (multiple >= warningMultiple) return "yellow";
  return "green";
}

export function getNavDiscountSignal(
  discountPct: number,
  warningPct: number,
  redPct: number,
): ContagionSignal {
  if (discountPct <= redPct) return "red";
  if (discountPct <= warningPct) return "yellow";
  return "green";
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

type ListedPrice = {
  price: number;
  previousClose: number;
  dailyChangePct: number;
  ytdChangePct: number;
  observationDate: string;
  sourceUrl: string;
};

async function fetchListedPrice(ticker: string): Promise<ListedPrice> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "Mozilla/5.0 MacroCrisisDashboard/1.0" },
  });
  if (!response.ok) throw new Error(`Yahoo Chart ${ticker}: ${response.status}`);
  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points = closes.flatMap((close, index) =>
    close !== null &&
    close !== undefined &&
    Number.isFinite(close) &&
    timestamps[index]
      ? [{ value: close, timestamp: timestamps[index] }]
      : [],
  );
  if (points.length < 2) throw new Error(`${ticker}: insufficient history`);
  const latest = points.at(-1)!;
  const previous = points.at(-2)!;
  const latestDate = new Date(latest.timestamp * 1_000);
  const yearStart = Date.UTC(latestDate.getUTCFullYear(), 0, 1) / 1_000;
  const firstOfYear =
    points.find((point) => point.timestamp >= yearStart) ?? points[0];
  return {
    price: latest.value,
    previousClose: previous.value,
    dailyChangePct: percentChange(latest.value, previous.value),
    ytdChangePct: percentChange(latest.value, firstOfYear.value),
    observationDate: latestDate.toISOString().slice(0, 10),
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`,
  };
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
}

function closestYearAgo(
  observations: NumericObservation[],
  latestDate: string,
) {
  const target = new Date(`${latestDate}T00:00:00Z`);
  target.setUTCFullYear(target.getUTCFullYear() - 1);
  return observations.reduce<NumericObservation | null>((closest, item) => {
    if (item.date === latestDate) return closest;
    if (!closest) return item;
    const itemDistance = Math.abs(
      new Date(`${item.date}T00:00:00Z`).getTime() - target.getTime(),
    );
    const closestDistance = Math.abs(
      new Date(`${closest.date}T00:00:00Z`).getTime() - target.getTime(),
    );
    return itemDistance < closestDistance ? item : closest;
  }, null);
}

function buildBdcIndicator(): ContagionIndicator {
  const config = CONTAGION_WATCH_CONFIG.bdcNonAccrual;
  const trend = trendFromValues(config.valuePct, config.previousValuePct);
  const signal: ContagionSignal =
    config.valuePct > config.redAbovePct
      ? "red"
      : config.valuePct >= config.greenBelowPct
        ? "yellow"
        : "green";

  return {
    id: "bdc-non-accrual",
    name: "BDC非発生率",
    shortName: "BDC NON-ACCRUAL",
    valueLabel: `${config.valuePct.toFixed(1)}%`,
    secondaryLabel: `前回 ${config.previousValuePct.toFixed(1)}%`,
    signal,
    trend,
    trendLabel: trendLabel(trend),
    thresholdLabel: "3%未満 緑 / 3〜5% 黄 / 5%超 赤",
    markerPercent: clamp((config.valuePct / 7) * 100),
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    observationDate: config.observationDate,
    updateFrequency: config.updateFrequency,
    note: "BDC融資先の利払い停止が広がっているかを確認します。",
  };
}

function buildFundMarkdownIndicator(): ContagionIndicator {
  const config = CONTAGION_WATCH_CONFIG.privateCreditFundMarkdown;
  const currentNegative = config.currentNavChangePct < 0;
  const consecutiveNegative = currentNegative && config.previousNavChangePct < 0;
  const signal: ContagionSignal = consecutiveNegative
    ? "red"
    : currentNegative
      ? "yellow"
      : "green";
  const trend = trendFromValues(
    config.currentNavChangePct,
    config.previousNavChangePct,
  );

  return {
    id: "pc-fund-markdown",
    name: "大型PCファンドのNAV",
    shortName: "PC FUND MARKDOWN",
    valueLabel: `${config.currentNavChangePct > 0 ? "+" : ""}${config.currentNavChangePct.toFixed(1)}%`,
    secondaryLabel: `前月 ${config.previousNavChangePct > 0 ? "+" : ""}${config.previousNavChangePct.toFixed(1)}%`,
    signal,
    trend,
    trendLabel: currentNegative
      ? consecutiveNegative
        ? "連続マイナス"
        : "月次マイナス"
      : trendLabel(trend),
    thresholdLabel: "非マイナス 緑 / 単月マイナス 黄 / 連続マイナス 赤",
    markerPercent: clamp(((config.currentNavChangePct + 3) / 4) * 100),
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    observationDate: config.observationDate,
    updateFrequency: config.updateFrequency,
    note: "大型ファンドが保有資産を継続的に切り下げているかを見ます。",
  };
}

function buildRedemptionPressureIndicator(): ContagionIndicator {
  const config = CONTAGION_WATCH_CONFIG.semiliquidRedemptions;
  const signal = getRedemptionPressureSignal(
    config.requestPct,
    config.quarterlyCapPct,
    config.warningMultipleOfCap,
    config.redMultipleOfCap,
  );
  const trend = trendFromValues(
    config.requestPct,
    config.previousRequestPct,
  );
  const fulfillmentRatio =
    config.requestPct > 0 ? (config.fulfilledPct / config.requestPct) * 100 : 0;
  return {
    id: "pc-redemption-pressure",
    name: "セミリキッド・ファンド解約圧力",
    shortName: "FUND REDEMPTION PRESSURE",
    valueLabel: `請求 ${config.requestPct.toFixed(1)}%`,
    secondaryLabel: `充足 ${config.fulfilledPct.toFixed(1)}% · 応諾率 ${fulfillmentRatio.toFixed(0)}%`,
    signal,
    trend,
    trendLabel: trendLabel(trend),
    thresholdLabel: `上限未満 緑 / 上限${config.quarterlyCapPct}%超 黄 / 上限の2倍以上 赤`,
    markerPercent: clamp(
      (config.requestPct /
        (config.quarterlyCapPct * config.redMultipleOfCap * 1.25)) *
        100,
    ),
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    observationDate: config.observationDate,
    updateFrequency: config.updateFrequency,
    note: `${config.fundName}（約${config.fundAumBillionUsd}Bドル）の買戻し請求です。流動性ストレスであり、借り手の債務不履行を直接示しません。`,
  };
}

function buildAssetSaleIndicator(): ContagionIndicator {
  const config = CONTAGION_WATCH_CONFIG.privateCreditAssetSale;
  const signal: ContagionSignal =
    config.pricePctOfPar < config.redBelowParPct
      ? "red"
      : "yellow";
  return {
    id: "pc-asset-sale",
    name: "ローン売却・価格発見",
    shortName: "PRIVATE LOAN PRICE DISCOVERY",
    valueLabel: `${config.pricePctOfPar.toFixed(1)}% of par`,
    secondaryLabel: `売却総額 ${config.saleAmountBillionUsd.toFixed(1)}Bドル`,
    signal,
    trend: "stable",
    trendLabel:
      config.pricePctOfPar < config.redBelowParPct
        ? "大幅ディスカウント"
        : "流動化実行",
    thresholdLabel: `売却なし・通常返済 緑 / 流動化実行 黄 / ${config.redBelowParPct}% of par未満 赤`,
    markerPercent: clamp(
      ((config.pricePctOfPar - 90) / 10) * 100,
    ),
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    observationDate: config.observationDate,
    updateFrequency: config.updateFrequency,
    note: `${config.issuerName}の売却は公式開示上99.7% of parです。この取引では大幅な値崩れは確認されていません。`,
  };
}

async function buildOwlMarketIndicator(): Promise<ContagionIndicator> {
  const config = CONTAGION_WATCH_CONFIG.listedPrivateCredit.owl;
  try {
    const market = await fetchListedPrice(config.ticker);
    const signal: ContagionSignal =
      market.ytdChangePct <= config.redYtdPct
        ? "red"
        : market.ytdChangePct <= config.warningYtdPct
          ? "yellow"
          : "green";
    const trend: ContagionTrend =
      market.dailyChangePct < -0.25
        ? "falling"
        : market.dailyChangePct > 0.25
          ? "rising"
          : "stable";
    return {
      id: "owl-market-signal",
      name: "OWL市場シグナル",
      shortName: "BLUE OWL MARKET PROXY",
      valueLabel: `$${market.price.toFixed(2)}`,
      secondaryLabel: `年初来 ${market.ytdChangePct >= 0 ? "+" : ""}${market.ytdChangePct.toFixed(1)}% · 日次 ${market.dailyChangePct >= 0 ? "+" : ""}${market.dailyChangePct.toFixed(1)}%`,
      signal,
      trend,
      trendLabel: trendLabel(trend),
      thresholdLabel: `年初来 ${config.warningYtdPct}%超 緑 / ${config.warningYtdPct}〜${config.redYtdPct}% 黄 / ${config.redYtdPct}%以下 赤`,
      markerPercent: clamp(((market.ytdChangePct + 50) / 70) * 100),
      sourceName: "Yahoo Finance Chart",
      sourceUrl: market.sourceUrl,
      observationDate: market.observationDate,
      updateFrequency: "市場営業日・5分キャッシュ",
      note: "運用会社株の市場評価を示す代理指標です。ファンドの信用損失や解約額そのものではありません。",
    };
  } catch {
    return unavailableIndicator(
      "owl-market-signal",
      "OWL市場シグナル",
      "BLUE OWL MARKET PROXY",
      "Yahoo Finance Chart",
      `https://finance.yahoo.com/quote/${config.ticker}/`,
      "市場営業日・5分キャッシュ",
    );
  }
}

async function buildBdcNavDiscountIndicator(
  config: (typeof CONTAGION_WATCH_CONFIG.listedPrivateCredit.bdcNav)[number],
): Promise<ContagionIndicator> {
  const thresholds = CONTAGION_WATCH_CONFIG.listedPrivateCredit;
  const id = `${config.ticker.toLowerCase()}-nav-discount` as ContagionIndicator["id"];
  try {
    const market = await fetchListedPrice(config.ticker);
    const discountPct =
      ((market.price - config.navPerShareUsd) / config.navPerShareUsd) * 100;
    const signal = getNavDiscountSignal(
      discountPct,
      thresholds.navDiscountWarningPct,
      thresholds.navDiscountRedPct,
    );
    return {
      id,
      name: `${config.ticker} 株価/NAV`,
      shortName: `${config.name.toUpperCase()} NAV GAP`,
      valueLabel: `${discountPct >= 0 ? "+" : ""}${discountPct.toFixed(1)}%`,
      secondaryLabel: `株価 $${market.price.toFixed(2)} / NAV $${config.navPerShareUsd.toFixed(2)}`,
      signal,
      trend:
        market.dailyChangePct < -0.25
          ? "falling"
          : market.dailyChangePct > 0.25
            ? "rising"
            : "stable",
      trendLabel:
        discountPct < 0 ? "NAVディスカウント" : "NAVプレミアム",
      thresholdLabel: `乖離 ${thresholds.navDiscountWarningPct}%超 緑 / ${thresholds.navDiscountWarningPct}〜${thresholds.navDiscountRedPct}% 黄 / ${thresholds.navDiscountRedPct}%以下 赤`,
      markerPercent: clamp(((discountPct + 40) / 60) * 100),
      sourceName: `${config.sourceName} + Yahoo Finance Chart`,
      sourceUrl: config.sourceUrl,
      observationDate: market.observationDate,
      updateFrequency: thresholds.updateFrequency,
      note: `株価は日次、分母のNAVは${config.observationDate}時点です。市場のNAV評価を示しますが、実現損失とは限りません。`,
    };
  } catch {
    return unavailableIndicator(
      id,
      `${config.ticker} 株価/NAV`,
      `${config.name.toUpperCase()} NAV GAP`,
      config.sourceName,
      config.sourceUrl,
      thresholds.updateFrequency,
    );
  }
}

async function buildHyOasSpilloverIndicator(): Promise<ContagionIndicator> {
  const config = CONTAGION_WATCH_CONFIG.hyOasSpillover;
  try {
    const observations = await fetchFredSeries(config.seriesId);
    const latest = observations[0];
    const previous = observations[1] ?? latest;
    const valueBp = latest.value * 100;
    const previousBp = previous.value * 100;
    const signal: ContagionSignal =
      valueBp >= config.redBp
        ? "red"
        : valueBp >= config.warningBp
          ? "yellow"
          : "green";
    return {
      id: "hy-oas-spillover",
      name: "HY OASへの波及",
      shortName: "PUBLIC CREDIT SPILLOVER",
      valueLabel: `${valueBp.toFixed(0)}bp`,
      secondaryLabel: `前回 ${previousBp.toFixed(0)}bp`,
      signal,
      trend: trendFromValues(valueBp, previousBp),
      trendLabel: trendLabel(trendFromValues(valueBp, previousBp)),
      thresholdLabel: `${config.warningBp}bp未満 緑 / ${config.warningBp}〜${config.redBp}bp 黄 / ${config.redBp}bp以上 赤`,
      markerPercent: clamp((valueBp / 800) * 100),
      sourceName: "FRED ICE BofA US High Yield OAS",
      sourceUrl: `${FRED_SERIES_URL}${config.seriesId}`,
      observationDate: latest.date,
      updateFrequency: "米国営業日・FRED公表後",
      note: "私募ローン外側のストレスが公開信用市場へ広がったかを確認する点火指標です。",
    };
  } catch {
    return unavailableIndicator(
      "hy-oas-spillover",
      "HY OASへの波及",
      "PUBLIC CREDIT SPILLOVER",
      "FRED ICE BofA US High Yield OAS",
      `${FRED_SERIES_URL}${config.seriesId}`,
      "米国営業日・FRED公表後",
    );
  }
}

function unavailableIndicator(
  id: ContagionIndicator["id"],
  name: string,
  shortName: string,
  sourceName: string,
  sourceUrl: string,
  updateFrequency: string,
): ContagionIndicator {
  return {
    id,
    name,
    shortName,
    valueLabel: "取得不可",
    secondaryLabel: "次回取得時に再確認",
    signal: "unavailable",
    trend: "unavailable",
    trendLabel: "取得不可",
    thresholdLabel: "データ取得後に判定",
    markerPercent: 0,
    sourceName,
    sourceUrl,
    observationDate: null,
    updateFrequency,
    note: "推測値では補完していません。",
  };
}

async function buildPrivateCreditLiquidityData(
  bdcIndicator: ContagionIndicator,
): Promise<PrivateCreditLiquidityData> {
  const redemption = buildRedemptionPressureIndicator();
  const assetSale = buildAssetSaleIndicator();
  const [owl, hy, ...discounts] = await Promise.all([
    buildOwlMarketIndicator(),
    buildHyOasSpilloverIndicator(),
    ...CONTAGION_WATCH_CONFIG.listedPrivateCredit.bdcNav.map(
      buildBdcNavDiscountIndicator,
    ),
  ]);
  const liquidityIndicators = [redemption, assetSale, owl, ...discounts];
  const liquiditySignal = strongestSignal(liquidityIndicators);
  const creditDeteriorationConfirmed =
    hy.signal === "red" ||
    (hy.signal === "yellow" &&
      bdcIndicator.signal === "red" &&
      assetSale.signal === "red");
  const creditSignal: ContagionSignal = creditDeteriorationConfirmed
    ? "red"
    : hy.signal === "yellow" ||
        bdcIndicator.signal === "red" ||
        assetSale.signal === "red"
      ? "yellow"
      : hy.signal === "unavailable"
        ? "unavailable"
        : "green";
  const state =
    creditDeteriorationConfirmed
      ? "credit-spillover"
      : liquiditySignal === "red" || liquiditySignal === "yellow"
        ? "liquidity-run"
        : liquiditySignal === "unavailable"
          ? "unavailable"
          : "normal";

  return {
    state,
    liquiditySignal,
    liquidityStatus:
      liquiditySignal === "red"
        ? "解約圧力が強い"
        : liquiditySignal === "yellow"
          ? "流動性に注意"
          : liquiditySignal === "unavailable"
            ? "判定待ち"
            : "通常",
    creditSignal,
    creditStatus:
      creditSignal === "red"
        ? "公開信用へ波及"
        : creditSignal === "yellow"
          ? "点火接近"
          : creditSignal === "unavailable"
            ? "判定待ち"
            : "信用連鎖は未確認",
    description: creditDeteriorationConfirmed
      ? "解約・市場価格・BDC信用・HY OASが重なり、流動性ストレスが公開信用市場へ波及した組み合わせです。"
      : "解約請求と上場関連銘柄の市場評価には圧力がありますが、HY OASを含む信用の取付はまだ別段階です。",
    indicators: [redemption, assetSale, owl, hy],
    bdcDiscounts: discounts,
    creditDeteriorationConfirmed,
  };
}

async function fetchBankCreditSeries() {
  const config = CONTAGION_WATCH_CONFIG.bankNonbankCredit;
  try {
    return {
      observations: await fetchFredSeries(config.primarySeriesId),
      seriesId: config.primarySeriesId,
      sourceName: "FRED H.8: Loans to Nondepository Financial Institutions",
      fallback: false,
    };
  } catch {
    return {
      observations: await fetchFredSeries(config.fallbackSeriesId),
      seriesId: config.fallbackSeriesId,
      sourceName: "FRED: Commercial and Industrial Loans (fallback)",
      fallback: true,
    };
  }
}

async function buildBankCreditIndicator(
  bdcIndicator: ContagionIndicator,
): Promise<ContagionIndicator> {
  const config = CONTAGION_WATCH_CONFIG.bankNonbankCredit;
  try {
    const result = await fetchBankCreditSeries();
    const latest = result.observations[0];
    const previous = result.observations[1] ?? latest;
    const yearAgo = closestYearAgo(result.observations, latest.date);
    const yoy = yearAgo ? percentChange(latest.value, yearAgo.value) : 0;
    const trend = trendFromValues(latest.value, previous.value);
    const highBalanceThreshold = percentile(
      result.observations.map((item) => item.value),
      config.highBalancePercentile,
    );
    const highBalance = latest.value >= highBalanceThreshold;
    const bdcRising = bdcIndicator.trend === "rising";
    const bdcRed = bdcIndicator.signal === "red";
    const signal: ContagionSignal =
      highBalance && bdcRed && yoy >= config.dangerYoyGrowthPct
        ? "red"
        : highBalance &&
            (bdcRising || yoy >= config.warningYoyGrowthPct)
          ? "yellow"
          : "green";

    return {
      id: "bank-nonbank-credit",
      name: "銀行→ノンバンク向け与信",
      shortName: "BANK TO NONBANK CREDIT",
      valueLabel: `${latest.value.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}Bドル`,
      secondaryLabel: `前年比 ${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`,
      signal,
      trend,
      trendLabel: trendLabel(trend),
      thresholdLabel:
        "履歴内高水準かつBDC悪化で黄 / BDC 5%超・前年比10%以上で赤",
      markerPercent: clamp(((yoy + 5) / 20) * 100),
      sourceName: result.sourceName,
      sourceUrl: `${FRED_SERIES_URL}${result.seriesId}`,
      observationDate: latest.date,
      updateFrequency: result.fallback ? "月次（代替系列）" : "週次",
      note: result.fallback
        ? "H.8優先系列を取得できないためBUSLOANSで代替しています。"
        : "銀行与信が高水準のまま、BDCの延滞方向と重なるかを確認します。",
    };
  } catch {
    return {
      id: "bank-nonbank-credit",
      name: "銀行→ノンバンク向け与信",
      shortName: "BANK TO NONBANK CREDIT",
      valueLabel: "取得不可",
      secondaryLabel: "前年比を計算できません",
      signal: "unavailable",
      trend: "unavailable",
      trendLabel: "取得不可",
      thresholdLabel:
        "履歴内高水準かつBDC悪化で黄 / BDC 5%超・前年比10%以上で赤",
      markerPercent: 0,
      sourceName: "FRED H.8 / BUSLOANS",
      sourceUrl: `${FRED_SERIES_URL}${config.primarySeriesId}`,
      observationDate: null,
      updateFrequency: "週次（BUSLOANSは月次）",
      note: "FRED優先系列と代替系列の両方を取得できませんでした。",
    };
  }
}

export async function getContagionWatchData(): Promise<ContagionWatchData> {
  const bdc = buildBdcIndicator();
  const fund = buildFundMarkdownIndicator();
  const [bank, privateCreditLiquidity] = await Promise.all([
    buildBankCreditIndicator(bdc),
    buildPrivateCreditLiquidityData(bdc),
  ]);
  const indicators = [bank, bdc, fund];
  const available = indicators.filter((item) => item.signal !== "unavailable");
  const deterioratingCount = available.filter(
    (item) => item.signal === "yellow" || item.signal === "red",
  ).length;
  const allAvailable = available.length === indicators.length;
  const phaseTransition =
    allAvailable && deterioratingCount === 3 && bdc.signal === "red";

  if (!allAvailable) {
    return {
      state: "unavailable",
      signal: "unavailable",
      status: "判定待ち",
      description:
        "銀行与信データを取得できないため、相転移シグナルを判定できません。",
      indicators,
      privateCreditLiquidity,
      deterioratingCount,
      ignitionPrecursor:
        privateCreditLiquidity.creditDeteriorationConfirmed,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (phaseTransition) {
    return {
      state: "phase-transition",
      signal: "red",
      status: "急性化目前",
      description:
        "3経路が同時悪化しています。S&L型の慢性悪化から信用市場の急性化へ移る可能性を強く警戒します。",
      indicators,
      privateCreditLiquidity,
      deterioratingCount,
      ignitionPrecursor: true,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (deterioratingCount > 0) {
    return {
      state: "seepage",
      signal: "yellow",
      status: "染み出し開始",
      description:
        "ノンバンク与信、BDC延滞、ファンド評価の一部に悪化が見られます。信用市場への波及はまだ点火とは判定しません。",
      indicators,
      privateCreditLiquidity,
      deterioratingCount,
      ignitionPrecursor:
        privateCreditLiquidity.creditDeteriorationConfirmed,
      fetchedAt: new Date().toISOString(),
    };
  }

  return {
    state: "slow-burn",
    signal: "green",
    status: "じわじわ継続（安全）",
    description:
      "Private Creditの脆弱性は監視中ですが、銀行経由で信用市場へ急性化する組み合わせは確認されていません。",
    indicators,
    privateCreditLiquidity,
    deterioratingCount,
    ignitionPrecursor:
      privateCreditLiquidity.creditDeteriorationConfirmed,
    fetchedAt: new Date().toISOString(),
  };
}
