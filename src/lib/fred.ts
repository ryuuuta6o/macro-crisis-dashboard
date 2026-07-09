import manualData from "@/data/manual-indicators.json";
import publishedData from "@/data/published-indicators.json";
import {
  createIndicator,
  createUnavailableIndicator,
  INDICATOR_CONFIGS,
} from "@/lib/indicators";
import { buildMarginDebtM2IndicatorData } from "@/lib/margin-debt-m2";
import type {
  DashboardData,
  IndicatorConfig,
  IndicatorId,
  ManualIndicator,
  Signal,
} from "@/types/indicator";

const FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations";
const NY_FED_SOFR_URL =
  "https://markets.newyorkfed.org/api/rates/secured/sofr/last/2.json";
const TREASURY_YIELD_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml";
const TREASURY_AUCTIONS_URL =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const manualIndicators = manualData as Partial<
  Record<IndicatorId, ManualIndicator>
>;
const publishedIndicators = publishedData as Partial<
  Record<IndicatorId, ManualIndicator>
>;

type FredObservation = {
  date: string;
  value: string;
};

type FredResponse = {
  observations?: FredObservation[];
  error_code?: number;
  error_message?: string;
};

export type NumericObservation = {
  date: string;
  value: number;
};

export async function fetchFredSeries(
  seriesId: string,
): Promise<NumericObservation[]> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    throw new Error("FRED_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "90",
  });

  const response = await fetch(`${FRED_API_URL}?${params}`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}: ${response.status}`);
  }

  const data = (await response.json()) as FredResponse;

  if (data.error_code || !data.observations) {
    throw new Error(data.error_message ?? `Invalid FRED response: ${seriesId}`);
  }

  const observations = data.observations
    .filter((item) => item.value !== "." && Number.isFinite(Number(item.value)))
    .map((item) => ({ date: item.date, value: Number(item.value) }));

  if (observations.length === 0) {
    throw new Error(`No valid FRED observations: ${seriesId}`);
  }

  return observations;
}


type NyFedSofrResponse = {
  refRates?: Array<{
    effectiveDate: string;
    percentRate: number;
  }>;
};

async function fetchNyFedSofr(): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const response = await fetch(NY_FED_SOFR_URL, {
    next: { revalidate: 900 },
  });
  if (!response.ok) {
    throw new Error(`NY Fed SOFR request failed: ${response.status}`);
  }

  const payload = (await response.json()) as NyFedSofrResponse;
  const rates = payload.refRates?.filter((item) =>
    Number.isFinite(item.percentRate),
  );
  if (!rates || rates.length === 0) {
    throw new Error("NY Fed SOFR response has no valid rates");
  }

  const latest = rates[0];
  const previous = rates[1];
  const change = previous ? latest.percentRate - previous.percentRate : 0;
  const signal: Signal =
    Math.abs(change) >= 0.25 ? "red" : Math.abs(change) >= 0.1 ? "yellow" : "green";

  return {
    data: {
      value: latest.percentRate,
      previousValue: previous?.percentRate ?? null,
      observationDate: latest.effectiveDate,
      history: rates.slice(0, 2).map((item) => ({
        date: item.effectiveDate,
        value: item.percentRate,
      })),
    },
    signal,
    previousSignal: signal,
  };
}

async function fetchTreasuryYield(
  maturity: "10" | "30",
): Promise<ManualIndicator> {
  const year = new Date().getUTCFullYear();
  const params = new URLSearchParams({
    data: "daily_treasury_yield_curve",
    field_tdr_date_value: String(year),
  });
  const response = await fetch(`${TREASURY_YIELD_URL}?${params}`, {
    next: { revalidate: 900 },
    headers: { "User-Agent": "macro-crisis-dashboard/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Treasury yield request failed: ${response.status}`);
  }

  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((match) => match[1])
    .flatMap((entry) => {
      const date = entry.match(/<d:NEW_DATE[^>]*>([^<]+)/)?.[1]?.slice(0, 10);
      const value = entry.match(
        new RegExp(`<d:BC_${maturity}YEAR[^>]*>([^<]+)`),
      )?.[1];
      const numericValue = Number(value);
      return date && Number.isFinite(numericValue)
        ? [{ date, value: numericValue }]
        : [];
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  if (entries.length === 0) {
    throw new Error(`Treasury ${maturity}Y response has no valid rates`);
  }
  return toIndicatorData(entries);
}
function toIndicatorData(
  observations: NumericObservation[],
  multiplier = 1,
): ManualIndicator {
  return {
    value: observations[0].value * multiplier,
    previousValue: observations[1]
      ? observations[1].value * multiplier
      : null,
    observationDate: observations[0].date,
    history: observations.slice(0, 60).map((item) => ({
      date: item.date,
      value: item.value * multiplier,
    })),
  };
}

async function fetchSpread(config: IndicatorConfig): Promise<ManualIndicator> {
  const [left, right] = await Promise.all(
    config.fredSeries.map((series) => fetchFredSeries(series)),
  );
  const rightByDate = new Map(right.map((item) => [item.date, item.value]));
  const spreads = left.flatMap((item) => {
    const rightValue = rightByDate.get(item.date);
    return rightValue === undefined
      ? []
      : [{ date: item.date, value: item.value - rightValue }];
  });

  if (spreads.length === 0) {
    throw new Error(`No matching dates for ${config.id}`);
  }

  return toIndicatorData(spreads, config.multiplier);
}

async function fetchSofr(): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const [sofr, lower, upper] = await Promise.all([
    fetchFredSeries("SOFR"),
    fetchFredSeries("DFEDTARL"),
    fetchFredSeries("DFEDTARU"),
  ]);
  const lowerByDate = new Map(lower.map((item) => [item.date, item.value]));
  const upperByDate = new Map(upper.map((item) => [item.date, item.value]));
  const aligned = sofr.flatMap((item) => {
    const lowerValue = lowerByDate.get(item.date);
    const upperValue = upperByDate.get(item.date);
    return lowerValue === undefined || upperValue === undefined
      ? []
      : [{ ...item, lower: lowerValue, upper: upperValue }];
  });

  if (aligned.length === 0) {
    throw new Error("No aligned SOFR and policy range observations");
  }

  const latest = aligned[0];
  const previous = aligned[1];
  const sustainedStress = aligned
    .slice(0, 3)
    .every((item) => item.value >= item.upper + 0.25);
  const temporarySpike =
    latest.value >= latest.upper + 0.1 ||
    (previous !== undefined && latest.value - previous.value >= 0.15);
  const signal: Signal = sustainedStress
    ? "red"
    : temporarySpike
      ? "yellow"
      : "green";
  const previousSignal: Signal =
    previous === undefined
      ? signal
      : previous.value >= previous.upper + 0.25
        ? "red"
        : previous.value >= previous.upper + 0.1
          ? "yellow"
          : "green";

  return {
    data: {
      value: latest.value,
      previousValue: previous?.value ?? null,
      observationDate: latest.date,
      history: aligned.slice(0, 60).map((item) => ({
        date: item.date,
        value: item.value,
      })),
    },
    signal,
    previousSignal,
  };
}

async function fetchBankDepositFlow(): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const observations = await fetchFredSeries("DPSSCBW027SBOG");
  if (observations.length < 3) {
    throw new Error("Bank deposit series has insufficient observations");
  }

  const latestFlow = observations[0].value - observations[1].value;
  const previousFlow = observations[1].value - observations[2].value;
  const flows = observations.slice(0, -1).map((item, index) => ({
    date: item.date,
    value: item.value - observations[index + 1].value,
  }));
  const toSignal = (flow: number): Signal =>
    flow <= -100 ? "red" : flow <= -25 ? "yellow" : "green";

  return {
    data: {
      value: latestFlow,
      previousValue: previousFlow,
      observationDate: observations[0].date,
      history: flows.slice(0, 60),
    },
    signal: toSignal(latestFlow),
    previousSignal: toSignal(previousFlow),
  };
}

async function fetchMoneyMarketFunds(): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const observations = await fetchFredSeries("WRMFNS");
  if (observations.length < 3) {
    throw new Error("MMF series has insufficient observations");
  }

  const latestChange = observations[0].value - observations[1].value;
  const previousChange = observations[1].value - observations[2].value;
  const toSignal = (change: number): Signal =>
    change >= 100 ? "red" : change >= 25 ? "yellow" : "green";

  return {
    data: {
      value: observations[0].value,
      previousValue: observations[1].value,
      observationDate: observations[0].date,
      history: observations.slice(0, 60),
    },
    signal: toSignal(latestChange),
    previousSignal: toSignal(previousChange),
  };
}

async function fetchEmergencyLending(
  config: IndicatorConfig,
): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const observations = await fetchFredSeries(config.fredSeries[0]);
  if (observations.length < 2) {
    throw new Error(`${config.id} has insufficient observations`);
  }

  const multiplier = config.multiplier ?? 1;
  const values = observations.map((item) => item.value * multiplier);
  const toSignal = (
    value: number,
    previous: number | undefined,
  ): Signal => {
    if (config.id === "btfp") {
      if (value >= 50) return "red";
      if (value > 0) return "yellow";
      return "green";
    }

    const increase = previous === undefined ? 0 : value - previous;
    if (value >= 50 || increase >= 25) return "red";
    if (
      value >= 10 ||
      increase >= 2 ||
      (previous !== undefined && previous > 0 && value >= previous * 1.5)
    ) {
      return "yellow";
    }
    return "green";
  };

  return {
    data: {
      value: values[0],
      previousValue: values[1],
      observationDate: observations[0].date,
      history: observations.slice(0, 60).map((item, index) => ({
        date: item.date,
        value: values[index],
      })),
    },
    signal: toSignal(values[0], values[1]),
    previousSignal: toSignal(values[1], values[2]),
  };
}

type TreasuryAuction = {
  auction_date: string;
  original_security_term: string;
  inflation_index_security: string;
  bid_to_cover_ratio: string;
};

type TreasuryAuctionResponse = {
  data?: TreasuryAuction[];
};

async function fetchTreasuryAuctionStress(): Promise<{
  data: ManualIndicator;
  signal: Signal;
  previousSignal: Signal;
}> {
  const params = new URLSearchParams({
    fields:
      "auction_date,original_security_term,inflation_index_security,bid_to_cover_ratio",
    sort: "-auction_date",
    "page[size]": "200",
  });
  const response = await fetch(`${TREASURY_AUCTIONS_URL}?${params}`, {
    next: { revalidate: 900 },
  });
  if (!response.ok) {
    throw new Error(`Treasury auction request failed: ${response.status}`);
  }

  const payload = (await response.json()) as TreasuryAuctionResponse;
  const auctions = (payload.data ?? []).flatMap((item) => {
    const ratio = Number(item.bid_to_cover_ratio);
    const isNominalLongDuration =
      item.inflation_index_security === "No" &&
      /^(10|20|30)-Year$/.test(item.original_security_term);
    return isNominalLongDuration && Number.isFinite(ratio)
      ? [{ date: item.auction_date, value: ratio }]
      : [];
  });
  if (auctions.length < 2) {
    throw new Error("Treasury auction response has insufficient results");
  }

  const toSignal = (ratio: number): Signal =>
    ratio < 2.1 ? "red" : ratio < 2.3 ? "yellow" : "green";

  return {
    data: {
      value: auctions[0].value,
      previousValue: auctions[1].value,
      observationDate: auctions[0].date,
      sourceLabel: "U.S. Treasury Fiscal Data Auctions Query",
      sourceUrl:
        "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query",
      updateFrequency: "入札結果公表時",
      history: auctions.slice(0, 60),
    },
    signal: toSignal(auctions[0].value),
    previousSignal: toSignal(auctions[1].value),
  };
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

async function fetchMoveIndex(): Promise<ManualIndicator> {
  const response = await fetch(
    `${YAHOO_CHART_URL}/%5EMOVE?range=3mo&interval=1d`,
    {
      next: { revalidate: 900 },
      headers: { "User-Agent": "Mozilla/5.0" },
    },
  );
  if (!response.ok) {
    throw new Error(`MOVE market data request failed: ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const observations = closes.flatMap((close, index) => {
    const timestamp = timestamps[index];
    return close !== null &&
      close !== undefined &&
      Number.isFinite(close) &&
      timestamp
      ? [
          {
            value: close,
            date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          },
        ]
      : [];
  });
  if (observations.length < 2) {
    throw new Error("MOVE market data has insufficient observations");
  }

  return {
    value: observations.at(-1)!.value,
    previousValue: observations.at(-2)!.value,
    observationDate: observations.at(-1)!.date,
    sourceLabel: "ICE BofA MOVE Index via Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/%5EMOVE/",
    updateFrequency: "市場営業日終値",
    history: [...observations].reverse().slice(0, 60),
  };
}

async function fetchFredIndicator(config: IndicatorConfig) {
  if (config.mode === "ted-proxy" || config.mode === "fra-ois-proxy") {
    const data = await fetchSpread(config);
    return createIndicator(
      config,
      {
        ...data,
        sourceLabel:
          config.mode === "ted-proxy"
            ? "FRED proxy: 90-Day AA Financial CP (DCPF3M) - 3M T-Bill (DTB3)"
            : "FRED proxy: 90-Day AA Financial CP (DCPF3M) - SOFR",
        sourceUrl:
          config.mode === "ted-proxy"
            ? "https://fred.stlouisfed.org/graph/?id=DCPF3M,DTB3"
            : "https://fred.stlouisfed.org/graph/?id=DCPF3M,SOFR",
        updateFrequency: "FRED日次系列から自動計算",
      },
      "FRED",
    );
  }

  if (config.mode === "spread") {
    return createIndicator(config, await fetchSpread(config), "FRED");
  }

  if (config.mode === "sofr") {
    const { data, signal, previousSignal } = await fetchSofr();
    return createIndicator(
      config,
      { ...data, previousSignal },
      "FRED",
      signal,
    );
  }

  if (config.mode === "bank-deposits") {
    const { data, signal, previousSignal } = await fetchBankDepositFlow();
    return createIndicator(
      config,
      { ...data, previousSignal },
      "FRED",
      signal,
    );
  }

  if (config.mode === "mmf") {
    const { data, signal, previousSignal } = await fetchMoneyMarketFunds();
    return createIndicator(
      config,
      { ...data, previousSignal },
      "FRED",
      signal,
    );
  }

  if (config.mode === "emergency-lending") {
    const { data, signal, previousSignal } =
      await fetchEmergencyLending(config);
    return createIndicator(
      config,
      { ...data, previousSignal },
      "FRED",
      signal,
    );
  }

  if (config.mode === "margin-debt-m2") {
    const { data, signal, previousSignal } = buildMarginDebtM2IndicatorData(
      await fetchFredSeries(config.fredSeries[0]),
    );
    return createIndicator(
      config,
      { ...data, previousSignal },
      "FRED",
      signal,
    );
  }

  const observations = await fetchFredSeries(config.fredSeries[0]);
  return createIndicator(
    config,
    toIndicatorData(observations, config.multiplier),
    "FRED",
  );
}

async function resolveIndicator(config: IndicatorConfig) {
  if (config.id === "move") {
    try {
      return createIndicator(
        config,
        await fetchMoveIndex(),
        "market-data",
      );
    } catch {
      return createUnavailableIndicator(config);
    }
  }

  if (config.mode === "treasury-auction") {
    try {
      const { data, signal, previousSignal } =
        await fetchTreasuryAuctionStress();
      return createIndicator(
        config,
        { ...data, previousSignal },
        "fiscal-data",
        signal,
      );
    } catch {
      const manual = manualIndicators[config.id];
      return manual
        ? createIndicator(config, manual, "manual")
        : createUnavailableIndicator(config);
    }
  }

  if (config.mode === "manual") {
    const published = publishedIndicators[config.id];
    if (published) {
      return createIndicator(config, published, "published");
    }
    const manual = manualIndicators[config.id];
    return manual
      ? createIndicator(config, manual, "manual")
      : createUnavailableIndicator(config);
  }

  try {
    return await fetchFredIndicator(config);
  } catch {
    try {
      if (config.id === "dgs10" || config.id === "dgs30") {
        const maturity = config.id === "dgs10" ? "10" : "30";
        return createIndicator(
          config,
          await fetchTreasuryYield(maturity),
          "treasury",
        );
      }
      if (config.id === "sofr") {
        const { data, signal, previousSignal } = await fetchNyFedSofr();
        return createIndicator(
          config,
          { ...data, previousSignal },
          "ny-fed",
          signal,
        );
      }
    } catch {
      const manual = manualIndicators[config.id];
      return manual
        ? createIndicator(config, manual, "manual")
        : createUnavailableIndicator(config);
    }
    const manual = manualIndicators[config.id];
    return manual
      ? createIndicator(config, manual, "manual")
      : createUnavailableIndicator(config);
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const indicators = await Promise.all(INDICATOR_CONFIGS.map(resolveIndicator));

  return {
    indicators,
    fetchedAt: new Date().toISOString(),
    unavailableCount: indicators.filter(
      (item) => item.signal === "unavailable",
    ).length,
  };
}

