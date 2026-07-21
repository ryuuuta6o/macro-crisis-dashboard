"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WeatherRiskComposition } from "@/components/weather/WeatherRiskComposition";
import { buildRiskComposition } from "@/lib/risk-composition";
import type {
  AutomatedCondition,
  AutomatedConditionsData,
} from "@/lib/free-macro-data";
import type { GlobalRiskData } from "@/types/global-risk";
import type { DashboardData, IndicatorId, IndicatorValue, MarketNewsItem, Signal } from "@/types/indicator";

type WeatherKind = "sunny" | "cloudy" | "rainy" | "storm";
type FlowStatus = "正常" | "注意" | "警戒" | "危険" | "データ待ち";

type WeatherState = {
  kind: WeatherKind;
  label: "晴れ" | "くもり" | "雨" | "嵐";
  tone: string;
  accent: string;
  headline: string;
};

type DistanceRow = {
  label: string;
  value: string;
  status: string;
  signal: Signal;
};

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const signalPoints: Record<Signal, number> = {
  unavailable: 0,
  green: 0,
  yellow: 10,
  orange: 20,
  red: 30,
};

const signalLabel: Record<Signal, FlowStatus> = {
  green: "正常",
  yellow: "注意",
  orange: "警戒",
  red: "危険",
  unavailable: "データ待ち",
};

const signalTone: Record<Signal, string> = {
  green: "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100",
  yellow: "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
  orange: "border-orange-300/30 bg-orange-300/[0.09] text-orange-100",
  red: "border-rose-300/30 bg-rose-300/[0.09] text-rose-100",
  unavailable: "border-slate-400/20 bg-slate-400/[0.06] text-slate-300",
};

const importantWeights: Partial<Record<string, number>> = {
  "hy-oas": 1.6,
  "ig-oas": 1.45,
  "baa-aaa": 1.45,
  sofr: 1.45,
  "bank-deposit-outflow": 1.35,
  "discount-window": 1.35,
  "sahm-rule": 1.45,
  vix: 1.15,
  dgs10: 1.15,
  dgs30: 1.15,
  icsa: 1.15,
  news: 1.15,
};

const mainIndicatorIds: Array<IndicatorId | "sahm-rule" | "news"> = [
  "vix",
  "hy-oas",
  "ig-oas",
  "baa-aaa",
  "dgs10",
  "dgs30",
  "sofr",
  "sahm-rule",
  "icsa",
  "news",
];

const beginnerCopy: Record<string, { plain: string; why: string }> = {
  vix: {
    plain: "株式市場の不安心理を見る指標です。",
    why: "急上昇は市場参加者がリスクを避け始めているサインですが、VIXだけで金融危機かどうかは判断しません。",
  },
  "hy-oas": {
    plain: "信用力の低い企業がお金を借りる時のストレスを見る指標です。",
    why: "ここが急に悪化すると、信用市場に不安が広がっている可能性があります。",
  },
  "ig-oas": {
    plain: "比較的信用力の高い企業の社債ストレスを見る指標です。",
    why: "投資適格社債まで悪化すると、信用不安が広い企業へ波及している可能性があります。",
  },
  "baa-aaa": {
    plain: "安全度の高い社債と少しリスクの高い社債の差を見ます。",
    why: "差が広がるほど、投資家が企業信用に慎重になっている状態です。",
  },
  dgs10: {
    plain: "米国の10年国債利回りです。世界の金利の基準の一つです。",
    why: "上がりすぎると株式、不動産、企業借入に広く負担がかかります。",
  },
  dgs30: {
    plain: "米国の30年国債利回りです。超長期の金利環境を見ます。",
    why: "高止まりすると住宅ローン、企業投資、財政不安に影響しやすくなります。",
  },
  sofr: {
    plain: "銀行や金融機関の短期資金市場の状態を見る指標です。",
    why: "ここが乱れると、お金の流れそのものが詰まり始めている可能性があります。",
  },
  "sahm-rule": {
    plain: "失業率の悪化から景気後退入りを確認するための指標です。",
    why: "強い景気後退シグナルですが、単独で市場急落や金融危機を断定するものではありません。",
  },
  icsa: {
    plain: "新しく失業保険を申請した人の数です。",
    why: "週次で雇用悪化を早く確認できますが、短期ノイズもあるため単独では判断しません。",
  },
  news: {
    plain: "市場に影響しそうなニュースの強さをまとめた補助指標です。",
    why: "ニュース密度が高い時は、指標の悪化と重なっていないか確認します。",
  },
};

function isDashboardData(value: unknown): value is DashboardData {
  return typeof value === "object" && value !== null && Array.isArray((value as DashboardData).indicators);
}

function isNewsArray(value: unknown): value is MarketNewsItem[] {
  return Array.isArray(value);
}

function isGlobalRiskData(value: unknown): value is GlobalRiskData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as GlobalRiskData).regions)
  );
}

function isAutomatedConditionsData(value: unknown): value is AutomatedConditionsData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as AutomatedConditionsData).items)
  );
}

function signalFromCondition(condition?: AutomatedCondition): Signal {
  if (!condition || condition.status === "unavailable") return "unavailable";
  if (condition.status === "met") return "red";
  if (condition.status === "watch") return "yellow";
  return "green";
}

function formatValue(item?: IndicatorValue | SyntheticIndicator) {
  if (!item) return "データ待ち";
  if (item.numericValue === null) return item.value === null ? "データ待ち" : String(item.value);
  return `${item.numericValue.toFixed(item.decimals)}${item.unit}`;
}

function formatChange(item?: IndicatorValue | SyntheticIndicator) {
  if (!item || item.numericValue === null || item.previousNumericValue === null) return "前回比 データ待ち";
  const change = item.numericValue - item.previousNumericValue;
  return `${change >= 0 ? "+" : ""}${change.toFixed(item.decimals)}${item.unit}`;
}

function worstSignal(items: Array<IndicatorValue | undefined>) {
  const live = items.filter((item): item is IndicatorValue => Boolean(item));
  if (!live.length) return "unavailable" as Signal;
  return live.reduce<Signal>(
    (worst, item) => signalRank[item.signal] > signalRank[worst] ? item.signal : worst,
    "green",
  );
}

function getById(indicators: IndicatorValue[], id: string) {
  return indicators.find((item) => item.id === id);
}

function weatherFromData(indicators: IndicatorValue[], newsSignal: Signal, sahmSignal: Signal): WeatherState {
  const signals = [...indicators.map((item) => item.signal), newsSignal, sahmSignal].filter((signal) => signal !== "unavailable");
  const redCount = signals.filter((signal) => signal === "red").length;
  const orangeCount = signals.filter((signal) => signal === "orange").length;
  const yellowCount = signals.filter((signal) => signal === "yellow").length;
  const credit = worstSignal(["hy-oas", "ig-oas", "baa-aaa"].map((id) => getById(indicators, id)));
  const funding = worstSignal(["sofr", "fra-ois", "ted-spread"].map((id) => getById(indicators, id)));
  const bank = worstSignal(["bank-deposit-outflow", "discount-window", "btfp", "bank-cet1"].map((id) => getById(indicators, id)));
  const criticalIds = ["hy-oas", "ig-oas", "baa-aaa", "sofr"];
  const criticalRed = criticalIds.filter((id) => getById(indicators, id)?.signal === "red").length;
  const criticalYellow = ["hy-oas", "ig-oas", "baa-aaa", "sofr", "vix"].filter((id) => {
    const signal = getById(indicators, id)?.signal;
    return signal && signalRank[signal] >= 1;
  }).length;
  const ratesOrange = ["dgs10", "dgs30"].some((id) => {
    const signal = getById(indicators, id)?.signal;
    return signal && signalRank[signal] >= 2;
  });
  const claims = getById(indicators, "icsa");
  let claimsWorsening = false;
  if (claims && claims.numericValue !== null && claims.previousNumericValue !== null) {
    claimsWorsening = claims.numericValue > claims.previousNumericValue;
  }

  if (
    redCount >= 2 ||
    credit === "red" ||
    funding === "red" ||
    bank === "red" ||
    criticalRed >= 2 ||
    (sahmSignal === "red" && (credit === "yellow" || getById(indicators, "vix")?.signal === "yellow"))
  ) {
    return {
      kind: "storm",
      label: "嵐",
      tone: "from-rose-500/30 via-orange-400/15 to-slate-950",
      accent: "#fb7185",
      headline: "複数の警戒シグナルが重なっています。信用・流動性の点火層を慎重に確認する局面です。",
    };
  }

  if (orangeCount >= 2 || criticalYellow >= 2 || ratesOrange || sahmSignal === "yellow") {
    return {
      kind: "rainy",
      label: "雨",
      tone: "from-sky-500/20 via-indigo-400/15 to-slate-950",
      accent: "#60a5fa",
      headline: "市場は完全な悪天候ではありませんが、金利・信用・雇用の一部に注意が必要です。",
    };
  }

  if (
    yellowCount >= 2 ||
    ["dgs10", "dgs30", "vix"].some((id) => {
      const signal = getById(indicators, id)?.signal;
      return signal && signalRank[signal] >= 1;
    }) ||
    newsSignal !== "green" ||
    claimsWorsening
  ) {
    return {
      kind: "cloudy",
      label: "くもり",
      tone: "from-cyan-400/18 via-blue-500/10 to-slate-950",
      accent: "#67e8f9",
      headline: "株価は落ち着いていても、長期金利・ニュース・一部指標に注意して見る環境です。",
    };
  }

  return {
    kind: "sunny",
    label: "晴れ",
    tone: "from-amber-300/25 via-emerald-300/12 to-slate-950",
    accent: "#fbbf24",
    headline: "主要な信用・流動性指標はおおむね落ち着いています。急な悪化がないかを毎朝確認します。",
  };
}

function scoreFromData(indicators: IndicatorValue[], newsSignal: Signal, sahmSignal: Signal) {
  const selected = [
    ...["hy-oas", "ig-oas", "baa-aaa", "sofr", "bank-deposit-outflow", "discount-window", "vix", "dgs10", "dgs30", "icsa"]
      .flatMap((id) => {
        const item = getById(indicators, id);
        return item ? [{ id, signal: item.signal }] : [];
      }),
    { id: "news", signal: newsSignal },
    { id: "sahm-rule", signal: sahmSignal },
  ];
  const weighted = selected.reduce((sum, item) => sum + signalPoints[item.signal] * (importantWeights[item.id] ?? 1), 0);
  const max = selected.reduce((sum, item) => sum + 30 * (importantWeights[item.id] ?? 1), 0) || 1;
  return Math.round(Math.min(100, Math.max(0, (weighted / max) * 100)));
}

function newsSignalFromItems(news: MarketNewsItem[]) {
  if (!news.length) return "unavailable" as Signal;
  const top = news.slice(0, 3);
  if (top.some((item) => item.impactLevel === "red") || top.reduce((sum, item) => sum + item.impactScore, 0) / top.length >= 70) {
    return "red";
  }
  if (top.some((item) => item.impactLevel === "yellow") || top.reduce((sum, item) => sum + item.impactScore, 0) / top.length >= 40) {
    return "yellow";
  }
  return "green";
}

function weatherPoints(indicators: IndicatorValue[], news: MarketNewsItem[], newsSignal: Signal, sahmSignal: Signal) {
  const points: string[] = [];
  const dgs30 = getById(indicators, "dgs30");
  const hy = getById(indicators, "hy-oas");
  const vix = getById(indicators, "vix");
  const claims = getById(indicators, "icsa");

  if (dgs30 && signalRank[dgs30.signal] >= 1) {
    points.push("米30年債利回りが高めで、長期金利ストレスに注意が必要です。");
  }
  if (hy) {
    points.push(hy.signal === "green"
      ? "HY OASは平常圏で、信用市場の第1警戒線はまだ点灯していません。"
      : "HY OASに注意信号があり、企業信用市場の広がりを確認する局面です。");
  }
  if (sahmSignal === "unavailable") {
    points.push("サームルールは通常APIではデータ待ちです。雇用シグナルとして別枠で確認します。");
  } else if (signalRank[sahmSignal] >= 1) {
    points.push("サームルールが接近または点灯しており、景気後退シグナルとして注意します。");
  }
  if (vix && signalRank[vix.signal] >= 1) {
    points.push("VIXが上昇しており、市場心理の揺れに注意が必要です。");
  }
  if (claims && claims.numericValue !== null && claims.previousNumericValue !== null && claims.numericValue > claims.previousNumericValue) {
    points.push("新規失業保険申請件数が前回より増えており、雇用の変化を確認します。");
  }
  if (newsSignal !== "green" && news.length) {
    points.push(`市場インパクトニュースでは「${news[0].title}」が注目されています。`);
  }

  return points.slice(0, 3).length ? points.slice(0, 3) : [
    "主要な信用・流動性指標は大きく悪化していません。",
    "長期金利、VIX、雇用指標を毎朝確認すると全体像をつかみやすくなります。",
    "ニュースは単独では判断せず、信用市場や流動性指標と合わせて見ます。",
  ];
}

function distanceRows(indicators: IndicatorValue[], sahmSignal: Signal): DistanceRow[] {
  const rows: DistanceRow[] = [];
  const add = (id: string, label: string, warning: number, danger: number, unit = "", lowerIsWorse = false) => {
    const item = getById(indicators, id);
    if (!item || item.numericValue === null) {
      rows.push({ label, value: "データ待ち", status: "危険ラインまでの距離を確認中", signal: "unavailable" });
      return;
    }
    const value = item.numericValue;
    const distance = lowerIsWorse ? value - warning : warning - value;
    const close = lowerIsWorse ? value <= warning : value >= warning;
    const breachedDanger = lowerIsWorse ? value <= danger : value >= danger;
    rows.push({
      label,
      value: `${value.toFixed(item.decimals)}${unit || item.unit}`,
      status: breachedDanger
        ? "危険ラインを通過"
        : close
          ? "注意線に接近"
          : `注意線までまだ距離あり（あと${Math.abs(distance).toFixed(item.decimals)}${unit || item.unit}）`,
      signal: item.signal,
    });
  };
  add("hy-oas", "HY OAS", 400, 500, "bp");
  add("vix", "VIX", 30, 40);
  add("dgs10", "米10年債", 4.5, 5, "%");
  add("dgs30", "米30年債", 4.7, 5, "%");
  add("sofr", "SOFR", 5.5, 5.75, "%");
  rows.push({
    label: "サームルール",
    value: sahmSignal === "unavailable" ? "データ待ち" : signalLabel[sahmSignal],
    status: sahmSignal === "unavailable" ? "発動ラインまでの距離を確認中" : sahmSignal === "green" ? "発動ラインまでまだ距離あり" : "発動ラインに接近",
    signal: sahmSignal,
  });
  return rows;
}

type SyntheticIndicator = {
  id: "sahm-rule" | "news";
  name: string;
  value: number | string | null;
  numericValue: number | null;
  previousNumericValue: number | null;
  decimals: number;
  unit: string;
  signal: Signal;
  thresholdLabel: string;
  sourceName?: string;
  sourceUrl?: string;
  observationDate: string | null;
};

function buildCards(
  indicators: IndicatorValue[],
  news: MarketNewsItem[],
  newsSignal: Signal,
  sahmCondition?: AutomatedCondition,
): Array<IndicatorValue | SyntheticIndicator> {
  const newsScore = news.length ? Math.round(news.slice(0, 3).reduce((sum, item) => sum + item.impactScore, 0) / Math.min(3, news.length)) : null;
  const synthetic: Record<string, SyntheticIndicator> = {
    "sahm-rule": {
      id: "sahm-rule",
      name: "サームルール",
      value: sahmCondition?.numericValue ?? "データ待ち",
      numericValue: sahmCondition?.numericValue ?? null,
      previousNumericValue: null,
      decimals: 2,
      unit: "",
      signal: signalFromCondition(sahmCondition),
      thresholdLabel: "0.50以上で景気後退シグナルとして警戒",
      sourceName: sahmCondition?.sourceName ?? "FRED SAHMREALTIME",
      sourceUrl: sahmCondition?.sourceUrl ?? "https://fred.stlouisfed.org/series/SAHMREALTIME",
      observationDate: sahmCondition?.observedAt ?? null,
    },
    news: {
      id: "news",
      name: "ニュース危険度",
      value: newsScore,
      numericValue: newsScore,
      previousNumericValue: null,
      decimals: 0,
      unit: "/100",
      signal: newsSignal,
      thresholdLabel: "Top3平均 40以上で注意 / 70以上で危険",
      sourceName: "GDELT + 公的RSS",
      observationDate: news[0]?.publishedAt?.slice(0, 10) ?? null,
    },
  };

  return mainIndicatorIds.reduce<Array<IndicatorValue | SyntheticIndicator>>((items, id) => {
    if (id === "sahm-rule" || id === "news") {
      items.push(synthetic[id]);
      return items;
    }
    const item = getById(indicators, id);
    if (item) items.push(item);
    return items;
  }, []);
}

export function WeatherDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [globalRisk, setGlobalRisk] = useState<GlobalRiskData | null>(null);
  const [automatedConditions, setAutomatedConditions] =
    useState<AutomatedConditionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [
          indicatorResponse,
          newsResponse,
          globalRiskResponse,
          automatedResponse,
        ] = await Promise.all([
          fetch("/api/indicators", { cache: "no-store" }),
          fetch("/api/news", { cache: "no-store" }),
          fetch("/api/global-risk", { cache: "no-store" }),
          fetch("/api/automated-conditions", { cache: "no-store" }),
        ]);
        if (!indicatorResponse.ok) throw new Error("指標APIの取得に失敗しました");
        const indicatorJson: unknown = await indicatorResponse.json();
        const newsJson: unknown = newsResponse.ok ? await newsResponse.json() : [];
        const globalRiskJson: unknown = globalRiskResponse.ok
          ? await globalRiskResponse.json()
          : null;
        const automatedJson: unknown = automatedResponse.ok
          ? await automatedResponse.json()
          : null;
        if (!active) return;
        setDashboard(isDashboardData(indicatorJson) ? indicatorJson : null);
        setNews(isNewsArray(newsJson) ? newsJson : []);
        setGlobalRisk(isGlobalRiskData(globalRiskJson) ? globalRiskJson : null);
        setAutomatedConditions(
          isAutomatedConditionsData(automatedJson) ? automatedJson : null,
        );
        setError(isDashboardData(indicatorJson) ? null : "指標データ形式を確認中です");
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "データ取得に失敗しました");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const indicators = useMemo(() => dashboard?.indicators ?? [], [dashboard]);
  const newsSignal = useMemo(() => newsSignalFromItems(news), [news]);
  const sahmCondition = automatedConditions?.items.find(
    (condition) => condition.id === "sahm-rule",
  );
  const sahmSignal = signalFromCondition(sahmCondition);
  const weather = useMemo(() => weatherFromData(indicators, newsSignal, sahmSignal), [indicators, newsSignal, sahmSignal]);
  const score = useMemo(() => scoreFromData(indicators, newsSignal, sahmSignal), [indicators, newsSignal, sahmSignal]);
  const points = useMemo(() => weatherPoints(indicators, news, newsSignal, sahmSignal), [indicators, news, newsSignal, sahmSignal]);
  const cards = useMemo(
    () => buildCards(indicators, news, newsSignal, sahmCondition),
    [indicators, news, newsSignal, sahmCondition],
  );
  const distances = useMemo(() => distanceRows(indicators, sahmSignal), [indicators, sahmSignal]);
  const riskComposition = useMemo(
    () => buildRiskComposition(
      indicators,
      globalRisk ?? undefined,
      dashboard?.fetchedAt,
      automatedConditions ?? undefined,
    ),
    [automatedConditions, dashboard?.fetchedAt, globalRisk, indicators],
  );
  const flowGroups = useMemo(() => [
    { title: "信用市場", desc: "企業がお金を借りる時のストレス", signal: worstSignal(["hy-oas", "ig-oas", "baa-aaa"].map((id) => getById(indicators, id))) },
    { title: "短期資金市場", desc: "銀行や金融機関同士のお金の流れ", signal: worstSignal(["sofr", "fra-ois", "ted-spread"].map((id) => getById(indicators, id))) },
    { title: "銀行流動性", desc: "銀行からお金が逃げていないか", signal: worstSignal(["bank-deposit-outflow", "mmf-assets", "discount-window", "btfp", "bank-cet1"].map((id) => getById(indicators, id))) },
    { title: "国債市場", desc: "米国債市場と長期金利の安定度", signal: worstSignal(["dgs10", "dgs30", "treasury-auction", "move"].map((id) => getById(indicators, id))) },
    { title: "信用供給", desc: "銀行や市場がお金を貸し続けているか", signal: worstSignal(["sloos", "leveraged-loan-default"].map((id) => getById(indicators, id))) },
  ], [indicators]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className={`pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(135deg,var(--tw-gradient-stops))] ${weather.tone}`} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.055] px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl">
          <Link href="/" className="text-sm font-bold tracking-tight text-white">Macro Signal</Link>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="hidden sm:inline">市場環境の状態表示</span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1 text-cyan-100">Weather Beta</span>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_0.9fr] lg:py-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-cyan-100 backdrop-blur-xl">
              新NISA勢のための世界経済天気予報
            </p>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              世界経済
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-amber-100 bg-clip-text text-transparent">天気予報</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              新NISA勢のための、毎朝1分マーケットチェック。
              株価より先に見るべき危険信号を、天気予報のように分かりやすく表示します。
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              株価・金利・信用市場・雇用・ニュースをまとめて、今日の投資環境を「晴れ・くもり・雨・嵐」で表示します。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#today-weather" className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(255,255,255,0.22)] transition hover:-translate-y-0.5">
                今日の天気を見る
              </a>
              <Link href="/" className="rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 text-center text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/[0.10]">
                専門版を見る
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-slate-500">
              この表示は投資助言ではなく、公開データに基づく市場環境の状態表示です。
            </p>
          </div>

          <section id="today-weather" className="rounded-[2rem] border border-white/12 bg-white/[0.075] p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl sm:p-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-cyan-200">TODAY&apos;S MACRO WEATHER</p>
                <h2 className="mt-2 text-2xl font-black">今日の世界経済の天気</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                {loading ? "更新中" : dashboard?.fetchedAt ? formatDate(dashboard.fetchedAt) : "データ待ち"}
              </span>
            </div>

            <div className="mt-8 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <WeatherGlyph kind={weather.kind} color={weather.accent} />
              <div>
                <strong className="text-5xl font-black tracking-tight sm:text-6xl">{loading ? "確認中" : weather.label}</strong>
                <p className="mt-4 text-base leading-7 text-slate-200">{loading ? "公開データを取得しています。" : weather.headline}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-[220px_1fr]">
              <ScoreMeter score={loading ? 0 : score} accent={weather.accent} />
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold tracking-[0.16em] text-slate-400">TODAY&apos;S CONCLUSION</p>
                <h3 className="mt-2 text-xl font-bold">今日の結論</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {loading
                    ? "指標とニュースを取得しています。"
                    : `${weather.headline} ただし、企業信用市場全体への本格的な危機サインは、信用・流動性指標の複数悪化で確認します。`}
                </p>
                {error && <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-3 text-xs text-amber-100">{error}</p>}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl space-y-6 px-4 pb-20 sm:px-6 lg:px-8">
        <BentoCard title="今日のポイント3つ" eyebrow="3 POINTS" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            {points.map((point, index) => (
              <div key={point} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <span className="font-mono text-xs text-cyan-200">0{index + 1}</span>
                <p className="mt-3 text-sm leading-7 text-slate-200">{point}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <WeatherRiskComposition model={riskComposition} />

        <BentoCard title="お金の流れメーター" eyebrow="LIQUIDITY FLOW">
          <p className="mb-5 text-sm leading-7 text-slate-400">
            金融危機は、株価が下がるだけではなく「お金の流れ」が詰まることで深刻化します。ここでは、企業・銀行・短期金融市場・国債市場のお金の流れを確認します。
          </p>
          <div className="grid gap-3 md:grid-cols-5">
            {flowGroups.map((group) => (
              <div key={group.title} className={`rounded-3xl border p-4 ${signalTone[group.signal]}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white">{group.title}</h3>
                  <SignalDot signal={group.signal} />
                </div>
                <p className="mt-2 text-2xl font-black">{signalLabel[group.signal]}</p>
                <p className="mt-3 text-xs leading-5 text-slate-300">{group.desc}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <BentoCard title="危険ラインまでの距離" eyebrow="IGNITION DISTANCE">
            <div className="space-y-3">
              {distances.map((row) => (
                <div key={row.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{row.label}</strong>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${signalTone[row.signal]}`}>{row.value}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{row.status}</p>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard title="雇用・景気後退シグナル" eyebrow="EMPLOYMENT">
            <div className="space-y-3">
              <EmploymentRow
                title="サームルール"
                status={sahmCondition?.displayValue ?? "データ待ち"}
                desc="失業率の3か月平均が、過去12か月の最低値から0.5ポイント以上上昇すると景気後退シグナルとして警戒されます。公表後に改定される可能性があります。"
                signal={sahmSignal}
              />
              <EmploymentRow
                title="米失業率"
                status="データ待ち"
                desc="通常指標APIでは未提供です。追加API化するまでは景気補助指標として枠だけ表示します。"
                signal="unavailable"
              />
              <EmploymentRow
                title="新規失業保険申請件数"
                status={formatValue(getById(indicators, "icsa"))}
                desc="週次で雇用悪化を早く確認できますが、短期ノイズもあるため単独では判断しません。"
                signal={getById(indicators, "icsa")?.signal ?? "unavailable"}
              />
            </div>
          </BentoCard>
        </div>

        <BentoCard title="主要指標カード" eyebrow="KEY SIGNALS">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((item) => (
              <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">MARKET SIGNAL</p>
                    <h3 className="mt-1 text-lg font-black text-white">{item.name}</h3>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${signalTone[item.signal]}`}>
                    <SignalDot signal={item.signal} />
                    {signalLabel[item.signal]}
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <strong className="font-mono text-3xl text-white">{formatValue(item)}</strong>
                  <span className="font-mono text-xs text-slate-400">{formatChange(item)}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{beginnerCopy[item.id]?.plain ?? "市場環境を見るための補助指標です。"}</p>
                <p className="mt-3 text-xs leading-6 text-slate-500">{beginnerCopy[item.id]?.why ?? "単独では判断せず、他の信用・流動性指標と合わせて確認します。"}</p>
                <div className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">
                  <p>基準: {item.thresholdLabel}</p>
                  <p className="mt-1">ソース: {item.sourceName ?? ("source" in item ? item.sourceLabel ?? item.source : "データ待ち")}</p>
                  <p className="mt-1">更新日: {item.observationDate ?? "データ待ち"}</p>
                </div>
              </article>
            ))}
          </div>
        </BentoCard>

        <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.12] to-white/[0.04] p-6 text-center backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-200">PRO DASHBOARD</p>
          <h2 className="mt-2 text-3xl font-black">もっと詳しく見る</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            信用市場・流動性・銀行ストレス・危機ルートの詳細は、専門版 Macro Crisis Dashboard で確認できます。
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950">
            専門版 Macro Crisis Dashboard へ
          </Link>
        </section>
      </section>
    </main>
  );
}

function WeatherGlyph({ kind, color }: { kind: WeatherKind; color: string }) {
  return (
    <div className="relative grid size-36 shrink-0 place-items-center rounded-[2rem] border border-white/10 bg-black/25 shadow-2xl" style={{ boxShadow: `0 0 70px ${color}33` }}>
      {kind === "sunny" && (
        <div className="size-20 rounded-full" style={{ background: `radial-gradient(circle, ${color}, #fde68a 56%, transparent 60%)`, boxShadow: `0 0 42px ${color}` }} />
      )}
      {kind === "cloudy" && (
        <div className="relative h-20 w-28">
          <div className="absolute bottom-4 left-2 h-12 w-24 rounded-full bg-cyan-100/80 blur-[1px]" />
          <div className="absolute bottom-8 left-7 size-14 rounded-full bg-white/90" />
          <div className="absolute bottom-5 left-0 size-12 rounded-full bg-slate-200/90" />
        </div>
      )}
      {kind === "rainy" && (
        <div className="relative h-24 w-28">
          <div className="absolute top-2 h-14 w-28 rounded-full bg-sky-200/80" />
          <div className="absolute top-0 left-7 size-16 rounded-full bg-slate-200/90" />
          {[18, 42, 66, 90].map((left) => <i key={left} className="absolute top-20 h-6 w-0.5 rotate-12 rounded-full bg-sky-300" style={{ left }} />)}
        </div>
      )}
      {kind === "storm" && (
        <div className="relative h-28 w-28">
          <div className="absolute top-3 h-14 w-28 rounded-full bg-slate-300/80" />
          <div className="absolute top-0 left-8 size-16 rounded-full bg-slate-100/90" />
          <div className="absolute left-12 top-16 h-16 w-7 skew-x-[-18deg] bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.65)] [clip-path:polygon(40%_0,100%_0,62%_42%,100%_42%,18%_100%,40%_52%,0_52%)]" />
        </div>
      )}
    </div>
  );
}

function ScoreMeter({ score, accent }: { score: number; accent: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
      <div
        className="mx-auto grid size-36 place-items-center rounded-full"
        style={{ background: `conic-gradient(${accent} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
      >
        <div className="grid size-28 place-items-center rounded-full bg-[#06101f]">
          <div>
            <strong className="font-mono text-3xl">{score}</strong>
            <span className="font-mono text-slate-500"> / 100</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold">世界経済危険度</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">数値が高いほど、市場環境の警戒度が高い状態を示します。売買判断ではありません。</p>
    </div>
  );
}

function BentoCard({ eyebrow, title, className = "", children }: { eyebrow: string; title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6 ${className}`}>
      <p className="text-xs font-bold tracking-[0.18em] text-cyan-200">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SignalDot({ signal }: { signal: Signal }) {
  const color = signal === "red" ? "#fb7185" : signal === "orange" ? "#fb923c" : signal === "yellow" ? "#facc15" : signal === "green" ? "#4ade80" : "#94a3b8";
  return <i className="inline-block size-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }} />;
}

function EmploymentRow({ title, status, desc, signal }: { title: string; status: string; desc: string; signal: Signal }) {
  return (
    <div className={`rounded-2xl border p-4 ${signalTone[signal]}`}>
      <div className="flex items-center justify-between gap-3">
        <strong className="text-white">{title}</strong>
        <span className="text-sm font-black">{status}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新時刻不明";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
