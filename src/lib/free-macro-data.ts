import { NFP_REVISION_CONFIG } from "@/config/manual-data";
import { fetchFredSeries, type NumericObservation } from "@/lib/fred";
import type { IndicatorHistoryPoint } from "@/types/indicator";

export type AutomatedConditionStatus =
  | "met"
  | "watch"
  | "not_met"
  | "unavailable";

export type AutomatedConditionId =
  | "recession-probability"
  | "consumer-sentiment"
  | "housing-supply"
  | "term-premium"
  | "sofr-iorb"
  | "economic-activity"
  | "sahm-rule"
  | "nfp-revision"
  | "payroll-momentum"
  | "bank-failures";

export type AutomatedCondition = {
  id: AutomatedConditionId;
  label: string;
  status: AutomatedConditionStatus;
  numericValue: number | null;
  displayValue: string;
  note: string;
  sourceName: string;
  sourceUrl: string;
  observedAt: string | null;
  updateFrequency: string;
  provisional?: boolean;
  history?: IndicatorHistoryPoint[];
};

export type AutomatedConditionsData = {
  items: AutomatedCondition[];
  fetchedAt: string;
  unavailableCount: number;
};

type FredConditionDefinition = {
  id: Exclude<AutomatedConditionId, "bank-failures" | "nfp-revision">;
  seriesId: string;
  label: string;
  updateFrequency: string;
  evaluate: (observations: NumericObservation[]) => Omit<
    AutomatedCondition,
    "id" | "label" | "sourceName" | "sourceUrl" | "observedAt" | "updateFrequency"
  >;
};

const fredDefinitions: FredConditionDefinition[] = [
  {
    id: "recession-probability",
    seriesId: "RECPROUSM156N",
    label: "景気後退確率モデル上昇",
    updateFrequency: "月次公表時",
    evaluate: ([latest]) => ({
      status: latest.value >= 20 ? "met" : latest.value >= 10 ? "watch" : "not_met",
      numericValue: latest.value,
      displayValue: `${latest.value.toFixed(1)}%`,
      note: "無料のFRED景気後退確率系列。Moody's有料モデルの代替です。",
    }),
  },
  {
    id: "consumer-sentiment",
    seriesId: "UMCSENT",
    label: "消費者心理の悪化",
    updateFrequency: "月次公表時",
    evaluate: (observations) => {
      const latest = observations[0];
      const comparison = observations[Math.min(3, observations.length - 1)];
      const decline = comparison ? latest.value - comparison.value : 0;
      return {
        status: latest.value < 60 || decline <= -10
          ? "met"
          : latest.value < 70 || decline <= -5
            ? "watch"
            : "not_met",
        numericValue: latest.value,
        displayValue: latest.value.toFixed(1),
        note: `ミシガン大学消費者信頼感。約3カ月変化 ${decline >= 0 ? "+" : ""}${decline.toFixed(1)}pt。`,
      };
    },
  },
  {
    id: "housing-supply",
    seriesId: "MSACSR",
    label: "新築住宅供給月数",
    updateFrequency: "月次公表時",
    evaluate: ([latest]) => ({
      status: latest.value >= 9 ? "met" : latest.value >= 7 ? "watch" : "not_met",
      numericValue: latest.value,
      displayValue: `${latest.value.toFixed(1)}カ月`,
      note: "新築住宅の販売ペースに対する供給月数。7カ月以上で在庫圧力、9カ月以上で強い圧力として扱います。",
    }),
  },
  {
    id: "term-premium",
    seriesId: "THREEFYTP10",
    label: "米10年タームプレミアム",
    updateFrequency: "日次公表時",
    evaluate: ([latest]) => ({
      status: latest.value >= 1.5 ? "met" : latest.value >= 1 ? "watch" : "not_met",
      numericValue: latest.value,
      displayValue: `${latest.value.toFixed(2)}%`,
      note: "FRB Kim-Wrightモデル。1.0%以上で長期債保有の上乗せ負担を注意、1.5%以上で強い圧力として扱います。",
    }),
  },
  {
    id: "economic-activity",
    seriesId: "CFNAI",
    label: "実体経済活動の低下",
    updateFrequency: "月次公表時",
    evaluate: ([latest]) => ({
      status: latest.value <= -0.7 ? "met" : latest.value <= -0.3 ? "watch" : "not_met",
      numericValue: latest.value,
      displayValue: latest.value.toFixed(2),
      note: "無料公表のCFNAIを使用。民間の有料PMI 50割れ条件の代替です。",
    }),
  },
  {
    id: "sahm-rule",
    seriesId: "SAHMREALTIME",
    label: "サーム・ルール 0.5超",
    updateFrequency: "月次公表時",
    evaluate: ([latest]) => ({
      status: latest.value >= 0.5 ? "met" : latest.value >= 0.3 ? "watch" : "not_met",
      numericValue: latest.value,
      displayValue: latest.value.toFixed(2),
      note: "暫定値。0.50以上で成立、0.30以上で接近。雇用統計の下方修正で後日悪化する可能性があります。",
      provisional: true,
    }),
  },
  {
    id: "payroll-momentum",
    seriesId: "PAYEMS",
    label: "非農業雇用の増加ペース鈍化",
    updateFrequency: "月次公表時",
    evaluate: (observations) => {
      const latestChange = observations.length >= 2
        ? observations[0].value - observations[1].value
        : Number.NaN;
      const status = !Number.isFinite(latestChange)
        ? "unavailable"
        : latestChange < 0
          ? "met"
          : latestChange < 100
            ? "watch"
            : "not_met";
      return {
        status,
        numericValue: Number.isFinite(latestChange) ? latestChange : null,
        displayValue: Number.isFinite(latestChange) ? `${latestChange.toFixed(0)}K` : "取得不可",
        note: "無料APIでは改定幅を安定取得できないため、雇用者数の前月差で代替します。",
      };
    },
  },
];

function unavailableCondition(
  definition: FredConditionDefinition,
): AutomatedCondition {
  return {
    id: definition.id,
    label: definition.label,
    status: "unavailable",
    numericValue: null,
    displayValue: "取得不可",
    note: "無料APIから取得できませんでした。次回再検証時に再試行します。",
    sourceName: `FRED ${definition.seriesId}`,
    sourceUrl: `https://fred.stlouisfed.org/series/${definition.seriesId}`,
    observedAt: null,
    updateFrequency: definition.updateFrequency,
  };
}

async function fetchFredCondition(
  definition: FredConditionDefinition,
): Promise<AutomatedCondition> {
  try {
    const observations = await fetchFredSeries(definition.seriesId);
    const evaluated = definition.evaluate(observations);
    return {
      id: definition.id,
      label: definition.label,
      ...evaluated,
      sourceName: `FRED ${definition.seriesId}`,
      sourceUrl: `https://fred.stlouisfed.org/series/${definition.seriesId}`,
      observedAt: observations[0]?.date ?? null,
      updateFrequency: definition.updateFrequency,
      history: observations.slice(0, 60).map((item) => ({
        date: item.date,
        value: item.value,
      })),
    };
  } catch {
    return unavailableCondition(definition);
  }
}

async function fetchSofrIorbSpread(): Promise<AutomatedCondition> {
  const sourceUrl = "https://fred.stlouisfed.org/graph/?g=1BwmT";
  try {
    const [sofr, iorb] = await Promise.all([
      fetchFredSeries("SOFR"),
      fetchFredSeries("IORB"),
    ]);
    const iorbByDate = new Map(iorb.map((item) => [item.date, item.value]));
    const history = sofr.flatMap((item) => {
      const benchmark = iorbByDate.get(item.date);
      return benchmark === undefined
        ? []
        : [{ date: item.date, value: (item.value - benchmark) * 100 }];
    });
    if (!history.length) throw new Error("SOFR and IORB have no aligned observations");
    const latest = history[0];
    const status: AutomatedConditionStatus = latest.value >= 25
      ? "met"
      : latest.value >= 10
        ? "watch"
        : "not_met";
    return {
      id: "sofr-iorb",
      label: "SOFR-IORBスプレッド",
      status,
      numericValue: latest.value,
      displayValue: `${latest.value.toFixed(0)}bp`,
      note: "担保付き翌日物調達金利と準備預金金利の差。10bp以上で注意、25bp以上で強い短期資金圧力として扱います。",
      sourceName: "FRED SOFR / IORB",
      sourceUrl,
      observedAt: latest.date,
      updateFrequency: "営業日ごと",
      history: history.slice(0, 60),
    };
  } catch {
    return {
      id: "sofr-iorb",
      label: "SOFR-IORBスプレッド",
      status: "unavailable",
      numericValue: null,
      displayValue: "取得不可",
      note: "FREDのSOFRとIORBを同じ観測日で照合できませんでした。推測値では補完しません。",
      sourceName: "FRED SOFR / IORB",
      sourceUrl,
      observedAt: null,
      updateFrequency: "営業日ごと",
      history: [],
    };
  }
}

type FdicFailureResponse = {
  data?: Array<{
    data?: {
      FAILDATE?: string;
      NAME?: string;
    };
  }>;
};

function parseFdicDate(value: string) {
  const [month, day, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

async function fetchBankFailures(): Promise<AutomatedCondition> {
  const sourceUrl = "https://banks.data.fdic.gov/api/failures";
  try {
    const params = new URLSearchParams({
      fields: "NAME,CERT,FAILDATE,CITYST",
      sort_by: "FAILDATE",
      sort_order: "DESC",
      limit: "50",
      format: "json",
    });
    const response = await fetch(`${sourceUrl}?${params}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "MacroCrisisDashboard/1.0" },
    });
    if (!response.ok) throw new Error(`FDIC request failed: ${response.status}`);
    const payload = (await response.json()) as FdicFailureResponse;
    const failures = (payload.data ?? []).flatMap((item) => {
      const dateText = item.data?.FAILDATE;
      if (!dateText) return [];
      const date = parseFdicDate(dateText);
      return Number.isNaN(date.getTime()) ? [] : [{ date, name: item.data?.NAME ?? "Bank" }];
    }).sort((left, right) => right.date.getTime() - left.date.getTime());
    const ninetyDaysAgo = Date.now() - 90 * 86_400_000;
    const recent = failures.filter((item) => item.date.getTime() >= ninetyDaysAgo);
    const latest = failures[0];
    return {
      id: "bank-failures",
      label: "FDIC銀行破綻（90日）",
      status: recent.length >= 2 ? "met" : recent.length === 1 ? "watch" : "not_met",
      numericValue: recent.length,
      displayValue: `${recent.length}行`,
      note: recent.length
        ? `直近: ${recent[0].name}`
        : "直近90日でFDIC掲載の銀行破綻はありません。",
      sourceName: "FDIC Bank Failures API",
      sourceUrl,
      observedAt: latest ? latest.date.toISOString().slice(0, 10) : null,
      updateFrequency: "FDIC公表時 / 1時間ごとに確認",
    };
  } catch {
    return {
      id: "bank-failures",
      label: "FDIC銀行破綻（90日）",
      status: "unavailable",
      numericValue: null,
      displayValue: "取得不可",
      note: "FDIC無料APIから取得できませんでした。次回再検証時に再試行します。",
      sourceName: "FDIC Bank Failures API",
      sourceUrl,
      observedAt: null,
      updateFrequency: "FDIC公表時 / 1時間ごとに確認",
    };
  }
}

function manualNfpRevisionCondition(): AutomatedCondition {
  const value = NFP_REVISION_CONFIG.valueK;
  const previous = NFP_REVISION_CONFIG.previousValueK;
  const status: AutomatedConditionStatus =
    value <= NFP_REVISION_CONFIG.metAtK
      ? "met"
      : value <= NFP_REVISION_CONFIG.watchAtK
        ? "watch"
        : "not_met";
  const direction = value < previous
    ? "下方修正が拡大"
    : value > previous
      ? "下方修正が縮小"
      : "横ばい";

  return {
    id: "nfp-revision",
    label: "NFP下方修正",
    status,
    numericValue: value,
    displayValue: `${value.toLocaleString("en-US")}K`,
    note: `${direction}。表面の雇用統計が実態より強く見える可能性を確認します。`,
    sourceName: NFP_REVISION_CONFIG.sourceName,
    sourceUrl: NFP_REVISION_CONFIG.sourceUrl,
    observedAt: NFP_REVISION_CONFIG.observationDate,
    updateFrequency: NFP_REVISION_CONFIG.updateFrequency,
    provisional: true,
  };
}

export async function getAutomatedConditions(): Promise<AutomatedConditionsData> {
  const items = await Promise.all([
    ...fredDefinitions.map(fetchFredCondition),
    fetchSofrIorbSpread(),
    Promise.resolve(manualNfpRevisionCondition()),
    fetchBankFailures(),
  ]);
  return {
    items,
    fetchedAt: new Date().toISOString(),
    unavailableCount: items.filter((item) => item.status === "unavailable").length,
  };
}
