import type { UpdateItem, UpdateRadarData } from "@/types/indicator";

const levelStyle: Record<UpdateItem["level"], { dot: string; text: string; border: string; bg: string }> = {
  green: { dot: "bg-emerald-400", text: "text-emerald-100", border: "border-emerald-300/20", bg: "bg-emerald-300/[0.06]" },
  yellow: { dot: "bg-amber-300", text: "text-amber-100", border: "border-amber-300/20", bg: "bg-amber-300/[0.07]" },
  orange: { dot: "bg-orange-400", text: "text-orange-100", border: "border-orange-300/25", bg: "bg-orange-300/[0.08]" },
  red: { dot: "bg-rose-400", text: "text-rose-100", border: "border-rose-300/25", bg: "bg-rose-300/[0.08]" },
};

const directionLabel: Record<UpdateItem["direction"], string> = {
  worse: "悪化",
  better: "改善",
  unchanged: "変化なし",
  new: "新着",
};

export function UpdateRadar({ data }: { data: UpdateRadarData }) {
  return (
    <section id="update-radar" className="scroll-mt-24 rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.10),transparent_34%),linear-gradient(145deg,rgba(7,20,39,0.98),rgba(2,7,18,0.99))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">UPDATE RADAR</p>
          <h2 className="mt-1 text-2xl font-black text-white">今日なにが変わった？</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">前回値・前回シグナル・新着ニュースから、今日見るべき変化をまとめます。</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] text-slate-500">
          {formatDate(data.generatedAt)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryPill label="更新された情報" value={`${data.summary.totalUpdates}件`} />
        <SummaryPill label="危険度上昇" value={`${data.summary.worsened}件`} tone="red" />
        <SummaryPill label="危険度低下" value={`${data.summary.improved}件`} tone="green" />
        <SummaryPill label="新着ニュース" value={`${data.summary.newNews}件`} />
        <SummaryPill label="手動データ更新" value={`${data.summary.manualUpdates}件`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <h3 className="text-sm font-black text-white">重要更新</h3>
          <div className="mt-3 space-y-3">
            {data.highlights.map((item) => <UpdateCard key={item.id} item={item} />)}
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <h3 className="text-sm font-black text-white">指標更新</h3>
            <div className="mt-3 space-y-2">
              {data.indicatorUpdates.slice(0, 4).map((item) => (
                <a key={item.id} href={item.relatedIndicators?.[0] ? `#indicator-${item.relatedIndicators[0]}` : "#signals"} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3 text-xs hover:bg-white/[0.04]">
                  <span className="min-w-0">
                    <strong className="block truncate text-slate-100">{item.title}</strong>
                    <small className="mt-1 block font-mono text-slate-500">{item.before ?? "--"} → {item.after ?? "--"}</small>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 font-bold ${levelStyle[item.level].border} ${levelStyle[item.level].text}`}>{directionLabel[item.direction]}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">新着ニュース</h3>
            <div className="mt-3 space-y-2">
              {data.newsUpdates.slice(0, 3).map((item) => <UpdateCard key={item.id} item={item} compact />)}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-5 text-slate-500">
        更新情報は市場環境の変化を示すもので、売買判断ではありません。脆弱性の悪化だけで金融危機とは表示せず、点火層の悪化を最重要扱いにします。
      </p>
    </section>
  );
}

function SummaryPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "red" | "green" }) {
  const toneClass = tone === "red" ? "text-rose-100 border-rose-300/20 bg-rose-300/[0.07]" : tone === "green" ? "text-emerald-100 border-emerald-300/20 bg-emerald-300/[0.06]" : "text-cyan-100 border-cyan-300/15 bg-cyan-300/[0.05]";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold tracking-[0.14em] opacity-70">{label}</p>
      <strong className="mt-1 block font-mono text-2xl">{value}</strong>
    </div>
  );
}

function UpdateCard({ item, compact = false }: { item: UpdateItem; compact?: boolean }) {
  const style = levelStyle[item.level];
  return (
    <a href={item.relatedIndicators?.[0] ? `#indicator-${item.relatedIndicators[0]}` : item.sourceUrl ?? "#signals"} target={item.sourceUrl && !item.relatedIndicators?.[0] ? "_blank" : undefined} rel="noreferrer" className={`block rounded-3xl border ${style.border} ${style.bg} p-4 transition hover:bg-white/[0.055]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">{item.category.toUpperCase()}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black text-white">{item.title}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border ${style.border} px-2.5 py-1 text-[10px] font-bold ${style.text}`}>
          <i className={`size-2 rounded-full ${style.dot}`} />
          {directionLabel[item.direction]}
        </span>
      </div>
      <p className={`mt-3 text-sm leading-6 text-slate-300 ${compact ? "line-clamp-2" : ""}`}>{item.summary}</p>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
          {item.before !== undefined && item.after !== undefined && <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 font-mono">{item.before} → {item.after}</span>}
          {item.previousSignal && item.currentSignal && <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 font-mono">{item.previousSignal} → {item.currentSignal}</span>}
          <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">{formatDate(item.updatedAt)}</span>
          {item.sourceName && <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">{item.sourceName}</span>}
        </div>
      )}
    </a>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
