import type { MarketNewsItem } from "@/types/indicator";

export function ImpactNewsRail({ news }: { news: MarketNewsItem[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/80 p-4 backdrop-blur-xl">
      <p className="text-[9px] font-bold tracking-[0.18em] text-cyan-400">
        IMPACT NEWS TOP 3
      </p>
      <div className="mt-3 divide-y divide-white/[0.06]">
        {news.slice(0, 3).map((item, index) => (
          <a
            key={item.id}
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 py-3"
          >
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                item.impactLevel === "red"
                  ? "bg-red-500"
                  : item.impactLevel === "yellow"
                    ? "bg-orange-500"
                    : "bg-green-500"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <strong className="line-clamp-1 block text-xs text-slate-200">
                {item.title}
              </strong>
              <small className="mt-1 block text-[9px] text-slate-600">
                {item.impactCategory} · SCORE {item.impactScore}
              </small>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
