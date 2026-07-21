import Link from "next/link";
import type {
  RiskCompositionModel,
  RiskMeterItem,
} from "@/lib/risk-composition";
import type { Signal } from "@/types/indicator";

const signalColor: Record<Signal, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#fb923c",
  red: "#fb7185",
  unavailable: "#64748b",
};

const signalBar: Record<Signal, string> = {
  green: "linear-gradient(90deg, #0f766e, #2dd4bf)",
  yellow: "linear-gradient(90deg, #a16207, #fbbf24)",
  orange: "linear-gradient(90deg, #c2410c, #fb923c)",
  red: "linear-gradient(90deg, #be123c, #fb7185)",
  unavailable: "linear-gradient(90deg, #334155, #64748b)",
};

const signalStatus: Record<Signal, string> = {
  green: "落ち着き",
  yellow: "注意",
  orange: "警戒",
  red: "高め",
  unavailable: "観測待ち",
};

export function WeatherRiskComposition({ model }: { model: RiskCompositionModel }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.065] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-200">WHAT MAKES TODAY&apos;S SKY</p>
          <h2 className="mt-2 text-2xl font-black text-white">いまの空の成分</h2>
          <p className="mt-1 text-sm font-bold text-slate-300">現在のリスク構成</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-400">
          天気の内訳
        </span>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        今日の空模様を作っている「雲」の種類を分けています。割合は信号色から作る構成比で、生の金利やbp値は表示していません。
      </p>

      {model.calm ? (
        <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
          <div className="flex items-center gap-3">
            <WeatherMark signal="green" />
            <div>
              <strong className="text-lg text-emerald-100">空を厚く覆う雲は限定的</strong>
              <p className="mt-1 text-sm leading-6 text-slate-300">各成分の変化を引き続き観測します。</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex h-5 overflow-hidden rounded-full border border-white/10 bg-black/25 p-0.5" aria-label="現在のリスク構成比">
          {model.categories
            .filter((category) => category.contribution > 0)
            .map((category) => (
              <span
                key={category.id}
                title={`${category.name} ${category.contribution}%`}
                style={{
                  width: `${category.contribution}%`,
                  backgroundColor: signalColor[category.signal],
                }}
                className="first:rounded-l-full last:rounded-r-full"
              />
            ))}
        </div>
      )}

      <p className="mt-4 text-base font-bold leading-7 text-white">{model.summary}</p>

      <div id="risk-meters" className="mt-7 scroll-mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-6">
        <div>
          <h3 className="text-xl font-black text-white">全リスクメーター</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            実装済みの指標を用途別にまとめ、0〜100の目盛りで現在位置を表示します。
          </p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500">
          スコアは信号色の重要度加重です。危機確率や価格予測ではありません。
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {model.meters.map((meter) => (
          <RiskMeterCard key={meter.id} meter={meter} />
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="text-sm font-bold text-white">ここから先は数字が出てきます（プロ用）</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">現在値、推移、判定ライン、データソースまで確認できます。</p>
        </div>
        <Link
          href="/#risk-composition-fold"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 sm:mt-0"
        >
          もっとくわしく見る → プロ用
        </Link>
      </div>
    </section>
  );
}

function RiskMeterCard({ meter }: { meter: RiskMeterItem }) {
  const score = meter.score ?? 0;
  const markerPosition = Math.min(99, Math.max(1, score));
  const directionMark = meter.direction === "worse" ? "↗" : meter.direction === "better" ? "↘" : "→";
  const directionTone = meter.direction === "worse"
    ? "text-rose-300"
    : meter.direction === "better"
      ? "text-emerald-300"
      : "text-slate-500";
  return (
    <Link
      href={meter.proHref}
      className="group rounded-2xl border border-white/[0.09] bg-[#07101f]/75 p-5 transition duration-200 hover:border-white/20 hover:bg-[#0a1527] active:translate-y-px sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-lg font-black tracking-[-0.02em] text-white sm:text-xl">{meter.name}</h4>
          <p className="mt-1.5 text-sm leading-6 text-slate-400">{meter.componentLabel}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-slate-400">
          {meter.availableCount}/{meter.totalCount}
        </span>
      </div>

      <div
        role="meter"
        aria-label={`${meter.name}のリスクメーター`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={meter.score ?? undefined}
        className="relative mt-5 h-4 overflow-hidden rounded-full border border-white/[0.06] bg-slate-800/80"
      >
        {[25, 50, 75].map((position) => (
          <span
            key={position}
            className="absolute inset-y-[-2px] z-10 w-px bg-white/20"
            style={{ left: `${position}%` }}
          />
        ))}
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${score}%`, background: signalBar[meter.signal] }}
        />
        {meter.score !== null && (
          <span
            className="absolute top-1/2 z-20 h-6 w-px -translate-y-1/2 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.35)]"
            style={{ left: `${markerPosition}%` }}
          />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          <strong className="font-mono text-3xl font-black tabular-nums text-white">
            {meter.score ?? "--"}
          </strong>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold" style={{ color: signalColor[meter.signal] }}>
            <span className="size-1.5 rounded-full" style={{ backgroundColor: signalColor[meter.signal] }} />
            {signalStatus[meter.signal]}
          </span>
        </div>
        <span className={`mb-1.5 text-sm font-bold ${directionTone}`}>
          {directionMark} {meter.directionLabel}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
        <p className="text-xs leading-5 text-slate-500">{meter.description}</p>
        <span className="shrink-0 text-xs font-bold text-cyan-200/70 transition group-hover:text-cyan-100">詳細 →</span>
      </div>
    </Link>
  );
}

function WeatherMark({ signal }: { signal: Signal }) {
  const color = signalColor[signal];
  if (signal === "green") {
    return (
      <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-black/20">
        <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
          <circle cx="16" cy="16" r="6" fill={color} />
          {[0, 45, 90, 135].map((angle) => (
            <line key={angle} x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth="2" transform={`rotate(${angle} 16 16)`} />
          ))}
        </svg>
      </span>
    );
  }
  return (
    <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-black/20">
      <svg viewBox="0 0 38 30" className="size-8" aria-hidden="true">
        <path d="M9 23h21a6 6 0 0 0 0-12 10 10 0 0 0-19-1A7 7 0 0 0 9 23Z" fill={color} opacity="0.85" />
        {(signal === "orange" || signal === "red") && (
          <path d="m20 20-4 7h4l-2 5 7-8h-4l3-4Z" fill="#fde68a" />
        )}
      </svg>
    </span>
  );
}
