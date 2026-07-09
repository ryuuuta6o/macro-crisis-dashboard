import Link from "next/link";
import { getBehaviorOverall, getCrisisBehaviorData } from "@/lib/behavior";
import type { RiskLevel } from "@/types/indicator";

const levelStyle: Record<
  RiskLevel,
  { dot: string; text: string; border: string }
> = {
  green: {
    dot: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/20",
  },
  yellow: {
    dot: "bg-amber-400",
    text: "text-amber-100",
    border: "border-amber-400/20",
  },
  orange: {
    dot: "bg-orange-400",
    text: "text-orange-100",
    border: "border-orange-400/25",
  },
  red: {
    dot: "bg-rose-400",
    text: "text-rose-100",
    border: "border-rose-400/25",
  },
};

export function BehaviorDashboardSummary() {
  const data = getCrisisBehaviorData();
  const overall = getBehaviorOverall(data.items);
  const overallStyle = levelStyle[overall.level];

  return (
    <section
      id="behavior-summary"
      className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_90%_0%,rgba(168,85,247,0.12),transparent_34%),linear-gradient(145deg,rgba(10,23,44,0.98),rgba(3,10,24,0.98))] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-violet-300">
            BEHAVIOR SIGNAL
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Crisis Behavior Tracker
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            危機前に誰がどう動いているか
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border ${overallStyle.border} bg-black/20 px-3 py-1.5 text-[10px] font-bold ${overallStyle.text}`}
        >
          <i className={`size-2 rounded-full ${overallStyle.dot}`} />
          {overall.label}
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {data.items.slice(0, 5).map((item) => {
          const style = levelStyle[item.level];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
            >
              <span className="text-xs text-slate-300">{item.name}</span>
              <span className={`flex items-center gap-2 text-[10px] font-bold ${style.text}`}>
                <i className={`size-2 rounded-full ${style.dot}`} />
                {item.summary.split("。")[0]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">{overall.comment}</p>
      <Link
        href="/behavior"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-violet-300/20 bg-violet-300/[0.07] px-4 text-xs font-bold text-violet-100 transition hover:-translate-y-0.5 hover:border-violet-300/35"
      >
        行動シグナルの詳細を見る →
      </Link>
    </section>
  );
}
