import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { getBehaviorOverall, getCrisisBehaviorData } from "@/lib/behavior";
import type { RiskLevel } from "@/types/indicator";

export const metadata: Metadata = {
  title: "Crisis Behavior Tracker | Macro Signal",
  description:
    "金融危機前に人・企業・資金・政策当局がどのように動き始めているかを整理する行動シグナルページ。",
};

const levelStyle: Record<
  RiskLevel,
  { dot: string; text: string; border: string; label: string }
> = {
  green: {
    dot: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/20",
    label: "通常",
  },
  yellow: {
    dot: "bg-amber-400",
    text: "text-amber-100",
    border: "border-amber-400/25",
    label: "注意",
  },
  orange: {
    dot: "bg-orange-400",
    text: "text-orange-100",
    border: "border-orange-400/30",
    label: "警戒",
  },
  red: {
    dot: "bg-rose-400",
    text: "text-rose-100",
    border: "border-rose-400/35",
    label: "強い防衛行動",
  },
};

export default function BehaviorPage() {
  const data = getCrisisBehaviorData();
  const overall = getBehaviorOverall(data.items);
  const overallStyle = levelStyle[overall.level];

  return (
    <AppShell>
      <main className="relative mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 xl:pb-12">
        <header className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(168,85,247,0.16),transparent_32%),linear-gradient(140deg,rgba(10,25,48,0.98),rgba(3,10,24,0.98))] p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-violet-300">
                BEHAVIOR SIGNAL / EARLY WARNING
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                Crisis Behavior Tracker
              </h1>
              <p className="mt-2 text-lg font-bold text-slate-300">
                危機前行動トラッカー
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                安全弁や経済指標だけでなく、人・企業・資金・政策当局が守りへ動き始めているかを可視化します。
              </p>
            </div>
            <div className={`rounded-2xl border ${overallStyle.border} bg-black/20 px-5 py-4`}>
              <p className="text-[10px] font-bold text-slate-500">総合行動</p>
              <p className={`mt-2 flex items-center gap-2 text-sm font-bold ${overallStyle.text}`}>
                <i className={`size-3 rounded-full ${overallStyle.dot}`} />
                {overall.label}
              </p>
            </div>
          </div>
          <p className="mt-5 rounded-2xl border border-white/[0.07] bg-black/15 px-4 py-3 text-sm leading-7 text-slate-300">
            {overall.comment}
          </p>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.items.map((item) => {
            const style = levelStyle[item.level];
            return (
              <article
                key={item.id}
                id={item.id}
                className={`rounded-3xl border ${style.border} bg-[#07101f]/90 p-5 sm:p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.16em] text-violet-300">
                      {item.name.toUpperCase()}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white">
                      {item.japaneseName}
                    </h2>
                  </div>
                  <span className={`flex items-center gap-2 rounded-full border ${style.border} bg-black/20 px-3 py-1.5 text-[10px] font-bold ${style.text}`}>
                    <i className={`size-2 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold leading-7 text-slate-200">
                  {item.summary}
                </p>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  {item.explanation}
                </p>

                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold text-slate-500">
                    現在見る行動
                  </p>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
                    {item.evidence.map((evidence) => (
                      <li key={evidence} className="flex gap-2">
                        <span className={style.text}>•</span>
                        <span>{evidence}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-3 text-[11px] leading-5 text-amber-100/70">
                  注意：{item.caution}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {item.sourceUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                    >
                      データソース ↗
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <footer className="mt-8 border-t border-white/[0.07] py-6 text-xs leading-6 text-slate-600">
          <p>
            最終更新：{new Date(data.updatedAt).toLocaleDateString("ja-JP")} / 初期実装は手動データです。投資助言ではありません。
          </p>
        </footer>
      </main>
    </AppShell>
  );
}
