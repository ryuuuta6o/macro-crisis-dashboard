import Link from "next/link";
import { getCrisisBehaviorData } from "@/lib/behavior";
import { buildApocalypseModel } from "@/lib/apocalypse";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";
import type { IndicatorValue, MarketNewsItem, RiskLevel } from "@/types/indicator";

const styles: Record<
  RiskLevel,
  { text: string; dot: string; border: string; bar: string; glow: string }
> = {
  green: {
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    border: "border-emerald-400/25",
    bar: "bg-emerald-400",
    glow: "rgba(52,211,153,0.75)",
  },
  yellow: {
    text: "text-amber-100",
    dot: "bg-amber-400",
    border: "border-amber-400/25",
    bar: "bg-amber-400",
    glow: "rgba(251,191,36,0.78)",
  },
  orange: {
    text: "text-orange-100",
    dot: "bg-orange-400",
    border: "border-orange-400/30",
    bar: "bg-orange-400",
    glow: "rgba(251,146,60,0.8)",
  },
  red: {
    text: "text-rose-100",
    dot: "bg-rose-400",
    border: "border-rose-400/30",
    bar: "bg-rose-400",
    glow: "rgba(251,113,133,0.82)",
  },
};

function MiniGauge({ score, level }: { score: number; level: RiskLevel }) {
  const style = styles[level];
  return (
    <div className="flex items-center gap-3">
      <strong className={`font-mono text-3xl ${style.text}`}>{score}</strong>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export async function ApocalypseCommandCenter({
  indicators,
  news,
}: {
  indicators: IndicatorValue[];
  news: MarketNewsItem[];
}) {
  const behavior = getCrisisBehaviorData();
  const investors = await getSmartMoneyInvestors();
  const model = buildApocalypseModel(indicators, news, behavior.items, investors);
  const scoreStyle = styles[model.level];

  return (
    <section id="apocalypse-command-center" className="mt-6 scroll-mt-24">
      <div className="overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(8,145,178,0.18),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(244,63,94,0.10),transparent_28%),linear-gradient(145deg,rgba(7,18,36,0.99),rgba(2,7,18,0.99))] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <header className="border-b border-white/[0.07] px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.24em] text-cyan-300">
                GLOBAL ECONOMIC EARLY WARNING
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Apocalypse Command Center
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                世界経済の警報を、信用・流動性・警告・脆弱性・資金逃避の順に統合します。
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] font-bold tracking-[0.16em] text-slate-400">
              RULE-BASED / EXPLAINABLE
            </span>
          </div>
        </header>

        <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[0.85fr_1.15fr]">
          <article className={`rounded-3xl border ${scoreStyle.border} bg-black/25 p-5 sm:p-6`}>
            <p className="text-[11px] font-bold tracking-[0.2em] text-slate-500">
              APOCALYPSE SCORE / 世界経済危険度
            </p>
            <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
              <div
                className="grid size-44 shrink-0 place-items-center rounded-full p-[10px] shadow-[0_0_70px_rgba(244,63,94,0.10)]"
                style={{
                  background: `conic-gradient(${scoreStyle.glow} ${model.score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                }}
              >
                <div className="grid size-full place-items-center rounded-full border border-white/[0.08] bg-[#050b16] text-center">
                  <div>
                    <strong className={`font-mono text-6xl leading-none ${scoreStyle.text}`}>
                      {model.score}
                    </strong>
                    <span className="block text-[10px] tracking-[0.25em] text-slate-600">/ 100</span>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className={`flex items-center gap-2 text-sm font-black tracking-[0.16em] ${scoreStyle.text}`}>
                  <i className={`size-2.5 rounded-full ${scoreStyle.dot}`} />
                  {model.label}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{model.comment}</p>
                <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-[11px] leading-5 text-slate-500">
                  危機の発生確率や残り時間ではありません。安全弁35%、警告20%、脆弱性20%、資金逃避15%、ニュース10%の現在ストレス合成値です。
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {model.components.map((component) => {
                const level = component.score >= 75 ? "red" : component.score >= 50 ? "orange" : component.score >= 25 ? "yellow" : "green";
                return (
                  <div key={component.key}>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span className="text-slate-400">{component.label}</span>
                      <span className="font-mono text-slate-300">{component.score} / weight {component.weight}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${styles[level].bar}`} style={{ width: `${component.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-rose-300">TODAY&apos;S ANOMALY</p>
                <h3 className="mt-1 text-xl font-bold text-white">今日の異常検知</h3>
              </div>
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] text-slate-500">
                {model.anomalies.length} signals
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              信号悪化、変化幅、高ストレス継続をルールベースで順位付けしています。
            </p>
            <div className="mt-5 space-y-3">
              {model.anomalies.length > 0 ? model.anomalies.map((item, index) => {
                const style = styles[item.signal];
                return (
                  <Link
                    key={item.id}
                    href={`/#indicator-${item.id}`}
                    className="group flex min-h-20 items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/25"
                  >
                    <span className="font-mono text-xl text-slate-700">0{index + 1}</span>
                    <span className={`size-2.5 shrink-0 rounded-full ${style.dot}`} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-white">{item.name}</strong>
                      <small className="mt-1 block text-[11px] text-slate-500">{item.reason}</small>
                    </span>
                    <span className={`shrink-0 font-mono text-sm ${style.text}`}>
                      {String(item.value ?? "-")} {item.unit}
                    </span>
                  </Link>
                );
              }) : (
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5 text-sm text-emerald-100">
                  現在、大きく悪化している指標はありません。
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="border-t border-white/[0.07] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <p className="text-[11px] font-bold tracking-[0.2em] text-violet-300">CRISIS TIMELINE</p>
            <h3 className="mt-1 text-xl font-bold text-white">危機までの連鎖</h3>
            <p className="mt-2 text-xs text-slate-500">カウントダウンではなく、現在どの段階の特徴が出ているかを示します。</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {model.timeline.map((stage, index) => (
              <div
                key={stage.english}
                className={`relative rounded-2xl border p-4 ${
                  stage.status === "current"
                    ? "border-cyan-300/35 bg-cyan-300/[0.08] shadow-[0_0_35px_rgba(34,211,238,0.08)]"
                    : stage.status === "passed"
                      ? "border-amber-300/20 bg-amber-300/[0.04]"
                      : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-600">0{index + 1}</span>
                  {stage.status === "current" && <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[9px] font-bold text-cyan-200">CURRENT</span>}
                </div>
                <strong className="mt-3 block text-sm text-white">{stage.name}</strong>
                <span className="mt-1 block text-[9px] tracking-[0.12em] text-slate-600">{stage.english}</span>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">{stage.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/[0.07] p-4 sm:p-6 lg:grid-cols-2 2xl:grid-cols-4">
          <article className={`rounded-3xl border ${styles[model.news.level].border} bg-black/20 p-5`}>
            <p className="text-[10px] font-bold tracking-[0.18em] text-rose-300">PANIC NEWS RADAR</p>
            <h3 className="mt-2 text-lg font-bold text-white">危機ニュース密度</h3>
            <div className="mt-4"><MiniGauge score={model.news.score} level={model.news.level} /></div>
            <p className="mt-2 text-xs font-bold text-slate-300">{model.news.label}</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              24時間以内 {model.news.recentCount}件 / 高影響 {model.news.redCount}件
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {model.news.categories.map(([category, count]) => (
                <span key={category} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-slate-400">{category} {count}</span>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {model.news.items.slice(0, 2).map((item) => (
                <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer" className="block text-[11px] leading-5 text-slate-400 transition hover:text-cyan-200">{item.title}</a>
              ))}
            </div>
          </article>

          <article className={`rounded-3xl border ${styles[model.escape.level].border} bg-black/20 p-5`}>
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">MARKET ESCAPE INDEX</p>
            <h3 className="mt-2 text-lg font-bold text-white">市場の資金逃避指数</h3>
            <div className="mt-4"><MiniGauge score={model.escape.score} level={model.escape.level} /></div>
            <p className="mt-2 text-sm font-bold text-slate-200">{model.escape.label}</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              MMF、銀行預金、VIX、HY/IG信用スプレッドと行動シグナルを統合。資金が安全側へ動いている強さを見ます。
            </p>
            <Link href="/behavior" className="mt-5 inline-flex min-h-10 items-center text-xs font-bold text-cyan-200">資金行動の詳細を見る →</Link>
          </article>

          <article className={`rounded-3xl border ${styles[model.defense.level].border} bg-black/20 p-5`}>
            <p className="text-[10px] font-bold tracking-[0.18em] text-amber-300">WEALTH DEFENSE MODE</p>
            <h3 className="mt-2 text-lg font-bold text-white">富裕層防衛モード</h3>
            <div className="mt-4"><MiniGauge score={model.defense.score} level={model.defense.level} /></div>
            <p className="mt-2 text-sm font-bold text-slate-200">{model.defense.label}</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              13Fのポジション傾向とSmart Money・内部者・逃避資金の手動シグナルを合成しています。
            </p>
            <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-[10px] leading-5 text-amber-100/70">
              13Fは最大45日遅れ。リアルタイム指標や安全弁ではなく補助情報です。
            </p>
          </article>

          <article className="rounded-3xl border border-violet-300/20 bg-black/20 p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-violet-300">NOTABLE INVESTOR WATCH</p>
            <h3 className="mt-2 text-lg font-bold text-white">著名投資家ウォッチ</h3>
            <p className="mt-1 text-[11px] text-slate-500">取得済み {model.defense.availableCount}名 / SEC 13F</p>
            <div className="mt-4 space-y-2">
              {model.defense.investors.map((investor) => (
                <div key={investor.slug} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs text-white">{investor.investor}</strong>
                    <span className="text-[10px] font-bold text-violet-200">{investor.stance}</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-500">{investor.period}</p>
                </div>
              ))}
            </div>
            <Link href="/investors" className="mt-5 inline-flex min-h-10 items-center text-xs font-bold text-violet-200">全ポジションを見る →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
