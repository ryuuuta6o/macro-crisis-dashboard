import Link from "next/link";
import { getGlobalRiskData, getGlobalRiskOverall } from "@/lib/global-risk";
import type { RiskLevel } from "@/types/indicator";

const levelStyle: Record<RiskLevel, { dot: string; text: string }> = {
  green: { dot: "bg-emerald-400", text: "text-emerald-200" },
  yellow: { dot: "bg-amber-400", text: "text-amber-100" },
  orange: { dot: "bg-orange-400", text: "text-orange-100" },
  red: { dot: "bg-rose-400", text: "text-rose-100" },
};

export function GlobalRiskDashboardSummary() {
  const data = getGlobalRiskData();
  const overall = getGlobalRiskOverall(data.regions);
  const highlighted = [...data.regions]
    .sort(
      (left, right) =>
        ["green", "yellow", "orange", "red"].indexOf(right.level) -
        ["green", "yellow", "orange", "red"].indexOf(left.level),
    )
    .slice(0, 5);

  return (
    <section
      id="global-risk-summary"
      className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_88%_0%,rgba(14,165,233,0.14),transparent_34%),linear-gradient(145deg,rgba(10,23,44,0.98),rgba(3,10,24,0.98))] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-sky-300">
            GLOBAL RISK MAP
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            世界経済リスクマップ
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            世界のどこでリスクが高まっているか
          </p>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-[10px] font-bold text-sky-100">
          {overall.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {highlighted.map((region) => {
          const style = levelStyle[region.level];
          return (
            <div
              key={region.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3"
            >
              <span className="text-xs text-slate-300">
                {region.japaneseName}
              </span>
              <i
                className={`size-2.5 rounded-full ${style.dot} shadow-[0_0_12px_currentColor] ${style.text}`}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">{overall.comment}</p>
      <Link
        href="/global-risk"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] px-4 text-xs font-bold text-sky-100 transition hover:-translate-y-0.5 hover:border-sky-300/35"
      >
        世界のリスク経路を見る →
      </Link>
    </section>
  );
}
