import type {
  ContagionIndicator,
  ContagionSignal,
  ContagionWatchData,
} from "@/types/contagion-watch";

const signalStyle: Record<
  ContagionSignal,
  {
    dot: string;
    text: string;
    border: string;
    background: string;
    bar: string;
    label: string;
  }
> = {
  green: {
    dot: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/20",
    background: "bg-emerald-400/[0.045]",
    bar: "bg-emerald-400",
    label: "安全",
  },
  yellow: {
    dot: "bg-amber-400",
    text: "text-amber-100",
    border: "border-amber-400/25",
    background: "bg-amber-400/[0.055]",
    bar: "bg-amber-400",
    label: "注意",
  },
  red: {
    dot: "bg-rose-400",
    text: "text-rose-100",
    border: "border-rose-400/30",
    background: "bg-rose-400/[0.06]",
    bar: "bg-rose-400",
    label: "危険",
  },
  unavailable: {
    dot: "bg-slate-600",
    text: "text-slate-400",
    border: "border-slate-500/20",
    background: "bg-slate-500/[0.035]",
    bar: "bg-slate-600",
    label: "未取得",
  },
};

function ContagionMetricCard({ item }: { item: ContagionIndicator }) {
  const style = signalStyle[item.signal];

  return (
    <article
      className={`relative overflow-hidden rounded-lg border ${style.border} bg-[#16181D] p-4`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${style.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">
            {item.shortName}
          </p>
          <h3 className="mt-1 text-sm font-bold text-white">{item.name}</h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${style.border} px-2.5 py-1 text-[10px] font-bold ${style.text}`}
        >
          <i className={`size-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <strong className="font-mono text-xl tabular-nums text-white">
          {item.valueLabel}
        </strong>
        <span className={`text-[10px] font-bold ${style.text}`}>
          {item.trendLabel}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-500">
        {item.secondaryLabel}
      </p>

      <div className="mt-4">
        <div className="relative h-1.5 rounded-full bg-white/[0.07]">
          <span className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
          <span className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
          <span
            className={`absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 ${style.bar}`}
            style={{ left: `${item.markerPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[9px] leading-4 text-slate-500">
          {item.thresholdLabel}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">{item.note}</p>
      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[9px] leading-4 text-slate-600">
        <p>
          更新 {item.observationDate ?? "取得不可"} · {item.updateFrequency}
        </p>
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-cyan-300/65 transition hover:text-cyan-200"
          >
            {item.sourceName} ↗
          </a>
        ) : (
          <p className="mt-1">{item.sourceName}</p>
        )}
      </div>
    </article>
  );
}

export function ContagionWatch({ data }: { data: ContagionWatchData }) {
  const style = signalStyle[data.signal];

  return (
    <section
      id="contagion-watch-panel"
      aria-labelledby="contagion-watch-panel-title"
      className={`relative mt-3 scroll-mt-24 overflow-hidden rounded-lg border ${style.border} bg-[#111317] p-5 sm:p-6`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-[5.15rem] hidden items-center lg:flex">
        <span className="size-2 rounded-full bg-slate-500" />
        <span className="h-px flex-1 bg-white/15" />
        <span className="border-y-[5px] border-l-[8px] border-y-transparent border-l-slate-500" />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">
            CONTAGION WATCH
          </p>
          <h2 id="contagion-watch-panel-title" className="mt-1 text-2xl font-bold text-white">
            染み出しウォッチ
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">
            Private Creditの慢性悪化が銀行を経由し、HY OASなどの信用市場へ急性化する橋を監視します。
          </p>
        </div>
        <div className={`rounded-lg border ${style.border} bg-[#16181D] px-4 py-3`}>
          <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">
            PHASE TRANSITION SIGNAL
          </p>
          <div className={`mt-1 flex items-center gap-2 ${style.text}`}>
            <i className={`size-2 rounded-full ${style.dot}`} />
            <strong className="text-lg">{data.status}</strong>
          </div>
          <p className="mt-1 font-mono text-[9px] text-slate-500">
            DETERIORATING {data.deterioratingCount} / 3
          </p>
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-4 text-[9px] font-bold tracking-[0.14em] text-slate-500">
        <span>VULNERABILITY / PRIVATE CREDIT</span>
        <span>IGNITION / HY OAS</span>
      </div>

      <div className="relative mt-3 grid gap-3 lg:grid-cols-3">
        {data.indicators.map((item) => (
          <ContagionMetricCard key={item.id} item={item} />
        ))}
      </div>

      <div className={`mt-4 rounded-md border ${style.border} bg-[#16181D] p-3`}>
        <p className="text-xs leading-6 text-slate-300">{data.description}</p>
        <p className="mt-1 text-[10px] text-slate-600">
          この表示は伝播条件の監視であり、金融危機の発生や時期を断定するものではありません。
        </p>
      </div>
    </section>
  );
}
