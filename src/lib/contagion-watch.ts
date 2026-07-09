import { CONTAGION_WATCH_CONFIG } from "@/config/manual-data";
import { fetchFredSeries, type NumericObservation } from "@/lib/fred";
import type {
  ContagionIndicator,
  ContagionSignal,
  ContagionTrend,
  ContagionWatchData,
} from "@/types/contagion-watch";

const FRED_SERIES_URL = "https://fred.stlouisfed.org/series/";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

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
  const bank = await buildBankCreditIndicator(bdc);
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
      deterioratingCount,
      ignitionPrecursor: false,
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
      deterioratingCount,
      ignitionPrecursor: false,
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
    deterioratingCount,
    ignitionPrecursor: false,
    fetchedAt: new Date().toISOString(),
  };
}
