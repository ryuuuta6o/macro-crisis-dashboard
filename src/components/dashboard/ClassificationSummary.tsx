import type { ClassificationSummary as Summary } from "@/lib/classification";
import type { Signal } from "@/types/indicator";

const signalStyle: Record<
  Signal,
  { dot: string; border: string; glow: string }
> = {
  green: {
    dot: "bg-emerald-400",
    border: "border-emerald-400/25",
    glow: "from-emerald-500/[0.12]",
  },
  yellow: {
    dot: "bg-amber-400",
    border: "border-amber-400/30",
    glow: "from-amber-500/[0.12]",
  },
  orange: {
    dot: "bg-orange-400",
    border: "border-orange-400/30",
    glow: "from-orange-500/[0.13]",
  },
  red: {
    dot: "bg-rose-400",
    border: "border-rose-400/30",
    glow: "from-rose-500/[0.14]",
  },
  unavailable: {
    dot: "bg-slate-500",
    border: "border-slate-500/25",
    glow: "from-slate-500/[0.08]",
  },
};

export function ClassificationSummary({
  summaries,
}: {
  summaries: Summary[];
}) {
  return (
    <section
      id="classification-summary"
      className="mt-5 grid scroll-mt-20 gap-3 lg:grid-cols-3"
    >
      {summaries.map((summary) => {
        const style = signalStyle[summary.signal];
        return (
          <article
            key={summary.type}
            className={`rounded-2xl border bg-gradient-to-br ${style.border} ${style.glow} to-[#081225] p-5 shadow-xl shadow-black/10`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">
                  {summary.type.replaceAll("_", " ").toUpperCase()}
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  {summary.title}
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/20 px-3 py-1.5 text-xs font-bold text-white">
                <i
                  className={`size-2 rounded-full ${style.dot} shadow-[0_0_12px_currentColor]`}
                />
                {summary.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {summary.comment}
            </p>
            <p className="mt-4 border-t border-white/[0.07] pt-3 font-mono text-[10px] text-slate-500">
              ALERTS {summary.alertCount} / LIVE {summary.availableCount} / TOTAL{" "}
              {summary.totalCount}
            </p>
          </article>
        );
      })}
    </section>
  );
}
