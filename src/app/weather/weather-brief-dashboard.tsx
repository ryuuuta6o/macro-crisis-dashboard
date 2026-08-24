import Link from "next/link";
import { assessIndicatorFreshness } from "@/lib/data-freshness";
import { getOverallSignal } from "@/lib/indicators";
import { buildUpdateRadarData } from "@/lib/update-radar";
import type { ContagionWatchData } from "@/types/contagion-watch";
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

function marketGap(indicators: IndicatorValue[], contagion: ContagionWatchData): BriefItem {
  const hy = byId(indicators, "hy-oas");
  const ccc = byId(indicators, "ccc-oas");
  const office = byId(indicators, "office-cmbs");
  const privateCredit = byId(indicators, "private-credit-default");
  const vix = byId(indicators, "vix");
  const dgs30 = byId(indicators, "dgs30");
  const redemption = contagion.privateCreditLiquidity.indicators.find(
    (item) => item.id === "pc-redemption-pressure",
  );
  const fsk = contagion.privateCreditLiquidity.bdcDiscounts.find(
    (item) => item.id === "fsk-nav-discount",
  );

  if (
    hy?.signal === "green" &&
    (contagion.privateCreditLiquidity.liquiditySignal === "yellow" ||
      contagion.privateCreditLiquidity.liquiditySignal === "red")
  ) {
    const evidence = [
      redemption && redemption.signal !== "unavailable" ? `${redemption.name} ${redemption.valueLabel}` : null,
      fsk && fsk.signal !== "unavailable" ? `${fsk.name} ${fsk.valueLabel}` : null,
    ].filter(Boolean).join("、");
    return {
      id: "gap-private-credit-liquidity",
      title: "今日のズレ：信用市場は平静、私募市場は流動性注意",
      summary: `HY OASは${formatIndicatorValue(hy)}で点火線の内側です。一方、${evidence || "Private Creditの解約・NAV乖離"}を確認中です。流動性の傷みと信用悪化を分けて見ます。`,
      direction: "unchanged",
      href: "/#contagion-watch-fold",
      meta: "公開信用 × Private Credit",
    };
  }

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

function briefItems(indicators: IndicatorValue[], updates: UpdateItem[], contagion: ContagionWatchData): BriefItem[] {
  const result = updates.slice(0, 2).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    direction: item.direction,
    href: item.relatedIndicators?.[0] ? `/#indicator-${item.relatedIndicators[0]}` : item.sourceUrl ?? "/",
    meta: `${item.before ?? "--"} → ${item.after ?? "--"}`,
  }));
  const fallbackItems: BriefItem[] = [
    { id: "no-large-change", title: "大きな信号変化はありません", summary: "高い水準が続いているだけの指標は、今日の異常には数えていません。次の公表値を待ちます。", direction: "unchanged", href: "/#update-radar-fold", meta: "変化速度を優先" },
    { id: "no-chain-deterioration", title: "点火層の連鎖悪化は未確認", summary: "信用・短期流動性・銀行資金が同時に悪化しているかを優先します。単独の赤だけで危機とは判定しません。", direction: "unchanged", href: "/#liquidity-core-fold", meta: "同時悪化を確認" },
  ];
  while (result.length < 2) result.push(fallbackItems[result.length]);
  return [...result.slice(0, 2), marketGap(indicators, contagion)];
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

export function WeatherBriefDashboard({ dashboard, news, contagion }: { dashboard: DashboardData; news: MarketNewsItem[]; contagion: ContagionWatchData }) {
  const indicators = dashboard.indicators;
  const overall = getOverallSignal(indicators);
  const weather = weatherCopy(overall);
  const radar = buildUpdateRadarData(indicators, news, dashboard.fetchedAt);
  const dailyBrief = briefItems(indicators, radar.highlights, contagion);
  const triggers = triggerCandidates(indicators);
  const staleCount = indicators.map((item) => assessIndicatorFreshness(item)).filter((item) => item.status === "stale" || item.status === "unknown").length;

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
          <SectionHead number="01" eyebrow="TODAY" title="今日の天気" meta={formatDate(dashboard.fetchedAt)} />
          <div className="mt-7 grid gap-6 sm:grid-cols-[150px_1fr] sm:items-center">
            <div className="grid h-32 place-items-center rounded-3xl border border-white/10 bg-black/20" style={{ boxShadow: `inset 0 0 40px ${weather.accent}18` }}><strong className="text-4xl font-black" style={{ color: weather.accent }}>{weather.label}</strong></div>
            <div><h3 className="text-xl font-black sm:text-2xl">{weather.headline}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{weather.plain}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400"><span className="rounded-full border border-white/10 px-3 py-1.5">比較可能 {radar.summary.comparableIndicators}件</span><span className={`rounded-full border px-3 py-1.5 ${staleCount ? "border-amber-300/20 text-amber-100" : "border-white/10"}`}>鮮度注意 {staleCount}件</span></div></div>
          </div>
          <WeatherLevelGauge overall={overall} indicators={indicators} />
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

const gaugePosition: Record<OverallSignal, number | null> = {
  unavailable: null,
  green: 12,
  "green-yellow": 31,
  yellow: 45,
  localized: 63,
  red: 82,
  crisis: 96,
};

const gaugeStage: Record<OverallSignal, string> = {
  unavailable: "観測中",
  green: "落ち着き",
  "green-yellow": "注意",
  yellow: "注意",
  localized: "局所ストレス",
  red: "強い警戒",
  crisis: "強い警戒",
};

function WeatherLevelGauge({ overall, indicators }: { overall: OverallSignal; indicators: IndicatorValue[] }) {
  const position = gaugePosition[overall];
  const safety = indicators.filter((item) => item.type === "safety_valve");
  const warnings = indicators.filter((item) => item.type === "warning_signal");
  const vulnerabilities = indicators.filter((item) => item.type === "vulnerability");
  const safetyStress = safety.filter((item) => item.signal === "yellow" || item.signal === "orange" || item.signal === "red").length;
  const warningStress = warnings.filter((item) => item.signal === "yellow" || item.signal === "orange" || item.signal === "red").length;
  const vulnerabilityStress = vulnerabilities.filter((item) => item.signal === "orange" || item.signal === "red").length;

  return (
    <div className="mt-7 border-t border-white/[0.08] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">市場ストレス水準</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">危機の確率ではなく、既存の信号判定が現在どの段階にあるかを示します。</p>
        </div>
        <strong className="text-sm text-cyan-100">現在位置：{gaugeStage[overall]}</strong>
      </div>

      <div role="meter" aria-label="市場ストレス水準" aria-valuemin={0} aria-valuemax={100} aria-valuenow={position ?? undefined} className="relative mt-6">
        <div className="grid h-3 grid-cols-4 overflow-hidden rounded-full border border-white/10">
          <span className="bg-emerald-400/70" />
          <span className="bg-cyan-300/65" />
          <span className="bg-amber-400/75" />
          <span className="bg-rose-400/80" />
        </div>
        {position !== null && (
          <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#08111f] shadow-[0_0_14px_rgba(255,255,255,0.35)]" style={{ left: `${position}%` }} />
        )}
        <div className="mt-2 grid grid-cols-4 text-center text-[10px] font-bold text-slate-500">
          <span>落ち着き</span><span>注意</span><span>局所ストレス</span><span>強い警戒</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <GaugeBasis label="安全弁" value={`${safetyStress}/${safety.length} 点灯`} description="信用・流動性・銀行資金" priority="最優先" items={safety} />
        <GaugeBasis label="警告サイン" value={`${warningStress}/${warnings.length} 点灯`} description="金利・雇用・市場心理" priority="次に確認" items={warnings} />
        <GaugeBasis label="脆弱性" value={`${vulnerabilityStress}/${vulnerabilities.length} 高警戒`} description="CRE・Private Credit・割高感" priority="被害の大きさ" items={vulnerabilities} />
      </div>
      <p className="mt-4 text-xs leading-6 text-slate-500">安全弁と警告サインの分子は黄・橙・赤の件数、脆弱性は橙・赤だけを数えます。観測待ちは点灯数に含めません。カードを開くと対象指標と状態を確認できます。</p>
    </div>
  );
}

const gaugeSignalLabel: Record<Signal, string> = {
  green: "落ち着き",
  yellow: "注意",
  orange: "警戒",
  red: "強い警戒",
  unavailable: "観測待ち",
};

function GaugeBasis({ label, value, description, priority, items }: { label: string; value: string; description: string; priority: string; items: IndicatorValue[] }) {
  return (
    <details className="group rounded-2xl border border-white/[0.08] bg-black/20 p-4 open:border-cyan-300/15 sm:col-span-3 lg:col-span-1">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm text-white">{label}</strong><span className="font-mono text-base font-black text-cyan-100">{value}</span></div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        <div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-500">{priority}</span><span className="text-[11px] font-bold text-cyan-200">{items.length}項目を見る <span className="inline-block transition group-open:rotate-180">⌄</span></span></div>
      </summary>
      <div className="mt-4 grid gap-2 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => (
          <a key={item.id} href={`/#indicator-${item.id}`} aria-label={`${item.name}の詳細データを見る`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 hover:border-cyan-300/20 hover:bg-white/[0.05]">
            <span className="min-w-0 truncate text-xs text-slate-300">{item.name}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold" style={{ color: signalColor[item.signal] }}><span className="size-1.5 rounded-full" style={{ backgroundColor: signalColor[item.signal] }} />{gaugeSignalLabel[item.signal]}</span>
          </a>
        ))}
      </div>
    </details>
  );
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString("ja-JP", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatIndicatorValue(item: IndicatorValue) {
  if (item.numericValue === null) return "観測待ち";
  return `${formatNumber(item.numericValue, item.decimals)}${item.unit}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新時刻不明";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(date);
}
