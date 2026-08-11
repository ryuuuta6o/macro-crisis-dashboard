"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { assessIndicatorFreshness } from "@/lib/data-freshness";
import { getOverallSignal } from "@/lib/indicators";
import { buildUpdateRadarData } from "@/lib/update-radar";
import type { DashboardData, IndicatorValue, MarketNewsItem, OverallSignal, Signal, UpdateItem } from "@/types/indicator";

type BriefItem = {
  id: string;
  title: string;
  summary: string;
  direction: "worse" | "better" | "unchanged" | "new";
  href: string;
  meta: string;
};

type TriggerCandidate = {
  id: string;
  name: string;
  current: string;
  distance: string;
  explanation: string;
  signal: Signal;
  progress: number;
};

const signalColor: Record<Signal, string> = {
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#fb7185",
  unavailable: "#94a3b8",
};

const directionMeta = {
  worse: { label: "雲が厚くなった", className: "border-rose-300/20 bg-rose-300/[0.055] text-rose-100" },
  better: { label: "雲が薄くなった", className: "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100" },
  unchanged: { label: "大きな変化なし", className: "border-slate-300/15 bg-slate-300/[0.04] text-slate-200" },
  new: { label: "新しい材料", className: "border-cyan-300/20 bg-cyan-300/[0.05] text-cyan-100" },
} as const;

function isDashboardData(value: unknown): value is DashboardData {
  return typeof value === "object" && value !== null && Array.isArray((value as DashboardData).indicators);
}

function byId(indicators: IndicatorValue[], id: string) {
  return indicators.find((item) => item.id === id);
}

function weatherCopy(signal: OverallSignal) {
  if (signal === "unavailable") return { label: "観測待ち", accent: "#94a3b8", headline: "重要な信用データの更新を待っています。", plain: "確認できたデータだけで、空模様を決めつけない状態です。" };
  if (signal === "crisis" || signal === "red") return { label: "嵐", accent: "#fb7185", headline: "信用とお金の流れに、複数の強い警戒サインがあります。", plain: "株価だけでなく、企業や銀行がお金を調達できるかを優先して確認する局面です。" };
  if (signal === "localized") return { label: "雨", accent: "#fb923c", headline: "一部の市場で雲が厚くなっています。", plain: "弱い場所はありますが、金融システム全体への広がりとは分けて見ます。" };
  if (signal === "yellow" || signal === "green-yellow") return { label: "くもり", accent: "#67e8f9", headline: "危機状態ではありませんが、見落としたくない変化があります。", plain: "信用・金利・雇用のうち、どこから雲が広がるかを確認する環境です。" };
  return { label: "晴れ", accent: "#fbbf24", headline: "主要な信用・流動性指標は、おおむね落ち着いています。", plain: "平静な時ほど、次に点灯しそうな線だけを短時間で確認します。" };
}

function marketGap(indicators: IndicatorValue[]): BriefItem {
  const hy = byId(indicators, "hy-oas");
  const ccc = byId(indicators, "ccc-oas");
  const office = byId(indicators, "office-cmbs");
  const privateCredit = byId(indicators, "private-credit-default");
  const vix = byId(indicators, "vix");
  const dgs30 = byId(indicators, "dgs30");

  if (hy?.signal === "green" && (office?.signal === "red" || privateCredit?.signal === "red")) {
    return { id: "gap-private-credit", title: "市場が見落としやすいズレ", summary: "社債市場全体はまだ平静ですが、商業不動産・非公開融資の傷みは残っています。火元と延焼を分けて見ます。", direction: "unchanged", href: "/#contagion-watch-fold", meta: "HY OAS × Private Credit" };
  }
  if (hy?.signal === "green" && ccc && (ccc.signal === "yellow" || ccc.signal === "red")) {
    return { id: "gap-credit-quality", title: "信用市場の内側に差があります", summary: "信用市場全体は落ち着いていても、最も信用力の低い企業ではストレスが高めです。CCCからHY全体へ広がるかを見ます。", direction: "worse", href: "/#indicator-ccc-oas", meta: "CCC OAS → HY OAS" };
  }
  if (vix?.signal === "green" && dgs30 && dgs30.signal !== "green") {
    return { id: "gap-rates-volatility", title: "株式の不安より、長期金利が重い", summary: "VIXが落ち着いていても、超長期金利の高さは企業借入・住宅・財政へ静かに圧力をかけます。", direction: "worse", href: "/#indicator-dgs30", meta: "VIX × 米30年債" };
  }
  return { id: "gap-none", title: "点火層の同時悪化は未確認", summary: "単独の赤ではなく、信用・流動性・銀行資金が同時に悪化するかを次に確認します。", direction: "unchanged", href: "/#liquidity-core-fold", meta: "信用 × 流動性" };
}

function briefItems(indicators: IndicatorValue[], updates: UpdateItem[]): BriefItem[] {
  const result = updates.slice(0, 2).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    direction: item.direction,
    href: item.relatedIndicators?.[0] ? `/#indicator-${item.relatedIndicators[0]}` : item.sourceUrl ?? "/",
    meta: `${item.before ?? "--"} → ${item.after ?? "--"}`,
  }));
  result.push(marketGap(indicators));
  if (result.length < 3) result.push({ id: "no-large-change", title: "大きな信号変化はありません", summary: "高い水準が続いているだけの指標は、今日の異常には数えていません。次の公表値を待ちます。", direction: "unchanged", href: "/#update-radar-fold", meta: "変化速度を優先" });
  return result.slice(0, 3);
}

function triggerCandidates(indicators: IndicatorValue[]): TriggerCandidate[] {
  const configs = [
    { id: "hy-oas", warning: 400, danger: 500, explanation: "企業信用全体への広がり" },
    { id: "ig-oas", warning: 1, danger: 1.5, explanation: "優良企業まで信用不安が広がる線" },
    { id: "baa-aaa", warning: 1, danger: 2, explanation: "社債の信用格差が広がる線" },
    { id: "vix", warning: 20, danger: 30, explanation: "株式市場の不安心理が強まる線" },
    { id: "dgs30", warning: 4.7, danger: 5, explanation: "超長期金利の圧力が強まる線" },
    { id: "ccc-oas", warning: 700, danger: 1000, explanation: "低格付け企業の調達難を見る線" },
  ];
  return configs.flatMap((config) => {
    const item = byId(indicators, config.id);
    if (!item || item.numericValue === null) return [];
    const value = item.numericValue;
    return [{
      id: item.id,
      name: item.name,
      current: `${formatNumber(value, item.decimals)}${item.unit}`,
      distance: value >= config.danger ? "強い警戒線を通過" : value >= config.warning ? `次の線まで あと${formatNumber(config.danger - value, item.decimals)}${item.unit}` : `最初の線まで あと${formatNumber(config.warning - value, item.decimals)}${item.unit}`,
      explanation: config.explanation,
      signal: item.signal,
      progress: Math.min(100, Math.max(0, (value / config.danger) * 100)),
    }];
  }).sort((left, right) => right.progress - left.progress).slice(0, 3);
}

export function WeatherBriefDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/indicators", { cache: "no-store" }), fetch("/api/news", { cache: "no-store" })])
      .then(async ([indicatorResponse, newsResponse]) => {
        if (!indicatorResponse.ok) throw new Error("指標データの取得に失敗しました");
        const indicatorJson: unknown = await indicatorResponse.json();
        const newsJson: unknown = newsResponse.ok ? await newsResponse.json() : [];
        if (!active) return;
        setDashboard(isDashboardData(indicatorJson) ? indicatorJson : null);
        setNews(Array.isArray(newsJson) ? newsJson as MarketNewsItem[] : []);
        setError(isDashboardData(indicatorJson) ? null : "指標データを確認中です");
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "データ取得に失敗しました"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const indicators = useMemo(() => dashboard?.indicators ?? [], [dashboard]);
  const overall = useMemo(() => getOverallSignal(indicators), [indicators]);
  const weather = useMemo(() => weatherCopy(overall), [overall]);
  const radar = useMemo(() => buildUpdateRadarData(indicators, news, dashboard?.fetchedAt ?? new Date().toISOString()), [dashboard?.fetchedAt, indicators, news]);
  const dailyBrief = useMemo(() => briefItems(indicators, radar.highlights), [indicators, radar.highlights]);
  const triggers = useMemo(() => triggerCandidates(indicators), [indicators]);
  const staleCount = useMemo(() => indicators.map((item) => assessIndicatorFreshness(item)).filter((item) => item.status === "stale" || item.status === "unknown").length, [indicators]);

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(59,130,246,0.10),transparent_28%)]" />
      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <Link href="/" className="text-sm font-black tracking-[0.08em]">MACRO SIGNAL</Link>
          <div className="flex items-center gap-3 text-xs"><Link href="/research-brief" className="text-cyan-200">朝3分ブリーフ</Link><Link href="/" className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300">詳細データ版</Link></div>
        </nav>

        <header className="py-10 sm:py-14">
          <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">WORLD ECONOMY NOW</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">世界経済の現在地</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">毎朝3分。いま何が変わり、次に何が点灯したら警戒が上がるかだけを表示します。</p>
        </header>

        <section id="today-weather" className="scroll-mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 sm:p-8">
          <SectionHead number="01" eyebrow="TODAY" title="今日の天気" meta={loading ? "取得中" : dashboard?.fetchedAt ? formatDate(dashboard.fetchedAt) : "観測待ち"} />
          <div className="mt-7 grid gap-6 sm:grid-cols-[150px_1fr] sm:items-center">
            <div className="grid h-32 place-items-center rounded-3xl border border-white/10 bg-black/20" style={{ boxShadow: `inset 0 0 40px ${weather.accent}18` }}><strong className="text-4xl font-black" style={{ color: weather.accent }}>{loading ? "確認中" : weather.label}</strong></div>
            <div><h3 className="text-xl font-black sm:text-2xl">{loading ? "公開データを取得しています" : weather.headline}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{weather.plain}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400"><span className="rounded-full border border-white/10 px-3 py-1.5">比較可能 {radar.summary.comparableIndicators}件</span><span className={`rounded-full border px-3 py-1.5 ${staleCount ? "border-amber-300/20 text-amber-100" : "border-white/10"}`}>鮮度注意 {staleCount}件</span></div>{error && <p className="mt-4 text-xs text-amber-200">{error}</p>}</div>
          </div>
        </section>

        <section id="today-changes" className="scroll-mt-6 mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 sm:p-8">
          <SectionHead number="02" eyebrow="WHAT CHANGED" title="今日変わった3つ" />
          <p className="mt-2 text-sm leading-6 text-slate-400">高いまま動かない指標ではなく、信号色・変化速度・市場のズレを優先します。</p>
          <div className="mt-5 grid gap-3">{dailyBrief.map((item, index) => { const meta = directionMeta[item.direction]; return <Link key={item.id} href={item.href} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:bg-white/[0.04] sm:grid-cols-[44px_1fr_auto] sm:items-center"><span className="font-mono text-sm text-slate-500">0{index + 1}</span><span><strong className="block text-base text-white">{item.title}</strong><small className="mt-1 block text-sm leading-6 text-slate-400">{item.summary}</small></span><span className={`w-fit rounded-full border px-3 py-1.5 text-[10px] font-bold ${meta.className}`}>{meta.label} · {item.meta}</span></Link>; })}</div>
        </section>

        <section id="next-trigger" className="scroll-mt-6 mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 sm:p-8">
          <SectionHead number="03" eyebrow="NEXT TRIGGER" title="次に点灯する候補" />
          <p className="mt-2 text-sm leading-6 text-slate-400">危機の予測ではなく、次に確認する警戒線までの距離です。</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">{triggers.map((item) => <Link key={item.id} href={`/#indicator-${item.id}`} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 hover:bg-white/[0.04]"><div className="flex items-center justify-between gap-3"><strong>{item.name}</strong><span className="font-mono text-sm" style={{ color: signalColor[item.signal] }}>{item.current}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full" style={{ width: `${item.progress}%`, backgroundColor: signalColor[item.signal] }} /></div><p className="mt-3 text-sm font-bold">{item.distance}</p><p className="mt-2 text-xs leading-5 text-slate-500">{item.explanation}</p></Link>)}</div>
        </section>

        <section id="evidence-links" className="scroll-mt-6 mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/research-brief" className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.065] p-6 hover:bg-cyan-300/[0.095]"><p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">20-DAY VALIDATION</p><h2 className="mt-2 text-xl font-black">朝3分ブリーフの試験配信</h2><p className="mt-2 text-sm leading-6 text-slate-300">市場のズレ、今日の変化、次の線を固定フォーマットで検証します。</p></Link>
          <Link href="/" className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.07]"><p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">DETAILED DATA</p><h2 className="mt-2 text-xl font-black">詳細データ版で確認する</h2><p className="mt-2 text-sm leading-6 text-slate-400">観測値、履歴、閾値、データ鮮度まで無料で掘り下げます。</p></Link>
        </section>
        <footer className="mt-10 border-t border-white/[0.07] py-8 text-xs leading-6 text-slate-600">本ページは市場環境の情報提供であり、投資助言や価格予測ではありません。</footer>
      </div>
    </main>
  );
}

function SectionHead({ number, eyebrow, title, meta }: { number: string; eyebrow: string; title: string; meta?: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">{number} / {eyebrow}</p><h2 className="mt-2 text-2xl font-black">{title}</h2></div>{meta && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] text-slate-400">{meta}</span>}</div>;
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString("ja-JP", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新時刻不明";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(date);
}
