import type { Metadata } from "next";
import { GlobalRiskExplorer } from "@/components/global-risk/GlobalRiskExplorer";
import { AppShell } from "@/components/layout/AppShell";
import { getGlobalRiskData, getGlobalRiskOverall } from "@/lib/global-risk";
import { getMarketImpactNews } from "@/lib/news";

export const metadata: Metadata = {
  title: "Global Risk Map | Macro Signal",
  description:
    "世界の金利・信用・不動産・地政学・AI半導体・流動性リスクを地域別に可視化するページ。",
};

export default async function GlobalRiskPage() {
  const [data, news] = await Promise.all([
    Promise.resolve(getGlobalRiskData()),
    getMarketImpactNews(),
  ]);
  const overall = getGlobalRiskOverall(data.regions);

  return (
    <AppShell>
      <main className="relative mx-auto max-w-[1680px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 xl:pb-12">
        <header className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_84%_0%,rgba(14,165,233,0.18),transparent_32%),linear-gradient(140deg,rgba(10,25,48,0.98),rgba(3,10,24,0.98))] p-6 sm:p-9">
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">
            GLOBAL RISK MAP / CONTAGION VIEW
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
            世界経済リスクマップ
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300">
            平面の世界地図で、GDP上位10か国、G7、ロシア、インド、南米、中東、アフリカ、半導体地域の危険度と波及経路を確認します。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-orange-300/20 bg-orange-300/[0.07] px-3 py-1.5 text-[10px] font-bold text-orange-100">
              {overall.label}
            </span>
            <span className="text-sm leading-7 text-slate-400">
              {overall.comment}
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            市場価格・ニュースは5分更新 / GDP・政策統計は公表時更新 / GDP順位：
            {data.gdpReference.sourceName} / {data.gdpReference.year}年推計
          </p>
        </header>

        <GlobalRiskExplorer data={data} news={news} />

        <footer className="mt-8 border-t border-white/[0.07] py-6 text-xs leading-6 text-slate-600">
          構造リスク基準日：{new Date(data.updatedAt).toLocaleDateString("ja-JP")} /
          市場価格は自動更新、GDP・政策・不動産統計は各機関の公表頻度に従います。地図境界：
          Natural Earth 1:110m。投資助言ではありません。
        </footer>
      </main>
    </AppShell>
  );
}
