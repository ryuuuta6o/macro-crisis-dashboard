import type { NextUpdateWatchData, UpdateScheduleItem } from "@/types/indicator";
import type { NextUpdateWatchItem } from "@/lib/next-update-watch";

const importanceTone: Record<UpdateScheduleItem["importance"], string> = {
  SSS: "border-rose-300/30 bg-rose-300/[0.08] text-rose-100",
  SS: "border-orange-300/25 bg-orange-300/[0.07] text-orange-100",
  S: "border-amber-300/25 bg-amber-300/[0.07] text-amber-100",
  A: "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100",
  B: "border-slate-400/20 bg-slate-400/[0.05] text-slate-300",
};

const statusLabel: Record<UpdateScheduleItem["status"], string> = {
  upcoming: "未更新",
  updated: "更新済み",
  delayed: "遅延中",
  unavailable: "取得不可",
};

const statusTone: Record<UpdateScheduleItem["status"], string> = {
  upcoming: "border-cyan-300/20 text-cyan-100",
  updated: "border-emerald-300/20 text-emerald-100",
  delayed: "border-rose-300/25 text-rose-100",
  unavailable: "border-slate-400/20 text-slate-400",
};

const categoryLabel: Record<UpdateScheduleItem["category"], string> = {
  credit: "信用",
  liquidity: "流動性",
  rates: "金利・国債",
  employment: "雇用",
  inflation: "インフレ",
  central_bank: "中央銀行",
  private_markets: "Private Markets",
  equity_vulnerability: "株式脆弱性",
  news: "ニュース",
  manual: "手動",
};

export function NextUpdateWatch({ data }: { data: NextUpdateWatchData }) {
  return (
    <section id="next-update-watch" className="scroll-mt-24 rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(167,139,250,0.12),transparent_34%),linear-gradient(145deg,rgba(12,16,39,0.98),rgba(2,7,18,0.99))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-violet-300">NEXT UPDATE WATCH</p>
          <h2 className="mt-1 text-2xl font-black text-white">次に更新される重要データ</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">公表スケジュールまたは運用上の更新予定です。確定時刻ではないものは「予定」として表示します。</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] text-slate-500">
          {formatDate(data.generatedAt)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {data.nextItems.map((item, index) => (
          <NextUpdateCard key={item.id} item={item as NextUpdateWatchItem} index={index} />
        ))}
      </div>
    </section>
  );
}

function NextUpdateCard({ item, index }: { item: NextUpdateWatchItem; index: number }) {
  const href = item.indicatorId ? `#indicator-${item.indicatorId}` : item.sourceUrl ?? "#next-update-watch";
  const external = !item.indicatorId && Boolean(item.sourceUrl);
  return (
    <a href={href} target={external ? "_blank" : undefined} rel="noreferrer" className="block rounded-3xl border border-white/[0.08] bg-white/[0.045] p-4 transition hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-black/20 font-mono text-xs text-slate-300">0{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">{categoryLabel[item.category]} · {item.updateFrequency.toUpperCase()}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{item.title}</h3>
          {item.indicatorId && <p className="mt-1 font-mono text-[10px] text-slate-500">ID: {item.indicatorId}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${importanceTone[item.importance]}`}>{item.importance}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">残り時間</span>
          <strong className="text-sm text-cyan-100">{item.remainingLabel}</strong>
        </div>
        <p className="mt-2 text-sm font-bold text-white">{item.displayTimeJa}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone[item.status]}`}>{statusLabel[item.status]}</span>
          <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-slate-400">{item.timezone}</span>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">{item.whyItMatters}</p>
      {item.watchLine && <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100">注目ライン: {item.watchLine}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">{item.sourceName}</span>
        <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">{item.updateFrequency === "manual" ? "手動更新" : "自動取得/公表時更新"}</span>
        {item.observationDate && <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">現観測日 {item.observationDate}</span>}
      </div>
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
