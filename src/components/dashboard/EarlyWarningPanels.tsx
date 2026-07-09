import type { BubbleTriggerModel } from "@/lib/bubble-trigger";
import type { EarlyWarningModel } from "@/lib/early-warning";
import type { ContagionWatchData } from "@/types/contagion-watch";
import type { RiskLevel, Signal } from "@/types/indicator";

const levelStyle: Record<
  RiskLevel,
  { dot: string; text: string; border: string; bg: string; bar: string }
> = {
  green: { dot: "bg-emerald-400", text: "text-emerald-200", border: "border-emerald-400/20", bg: "bg-emerald-400/[0.05]", bar: "bg-emerald-400" },
  yellow: { dot: "bg-amber-400", text: "text-amber-100", border: "border-amber-400/25", bg: "bg-amber-400/[0.06]", bar: "bg-amber-400" },
  orange: { dot: "bg-orange-400", text: "text-orange-100", border: "border-orange-400/30", bg: "bg-orange-400/[0.06]", bar: "bg-orange-400" },
  red: { dot: "bg-rose-400", text: "text-rose-100", border: "border-rose-400/30", bg: "bg-rose-400/[0.06]", bar: "bg-rose-400" },
};

function signalLevel(signal: Signal): RiskLevel {
  return signal === "unavailable" ? "green" : signal;
}

const signalCopy: Record<Signal, string> = {
  green: "正常",
  yellow: "注意",
  orange: "警戒",
  red: "危険",
  unavailable: "未取得",
};

function metricValue(value: number, decimals: number, unit: string) {
  const suffix = unit === "$B/w" ? "Bドル/週" : unit === "$B" ? "Bドル" : unit;
  return `${value.toFixed(decimals)}${suffix}`;
}

function changeValue(value: number, unit: string) {
  const absolute = Math.abs(value);
  const formatted = absolute > 0 && absolute < 0.01
    ? "0.01未満"
    : absolute >= 10
      ? absolute.toFixed(0)
      : absolute.toFixed(2);
  const suffix = unit === "%"
    ? "ポイント"
    : unit === "$B/w"
      ? "Bドル/週"
      : unit === "$B"
        ? "Bドル"
        : unit === "K"
          ? "千件"
          : unit || "ポイント";
  return `${value >= 0 ? "+" : "−"}${formatted}${suffix}`;
}

function compactDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function CrisisRiskRange({ model }: { model: EarlyWarningModel }) {
  return (
    <section id="crisis-risk-range" className="scroll-mt-24 rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,0.10),transparent_32%),linear-gradient(145deg,rgba(9,22,43,0.98),rgba(3,10,24,0.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">CRISIS RISK RANGE</p>
          <h2 className="mt-1 text-xl font-bold text-white">危機警戒レンジ</h2>
          <p className="mt-2 text-xs leading-6 text-slate-400">指標コンビネーションによる独自の警戒レンジ。統計的確率や価格予測ではありません。</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-slate-400">RANGE MODEL / NOT PROBABILITY</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {model.ranges.map((item) => {
          const style = levelStyle[item.level];
          return (
            <article key={item.id} className={`rounded-2xl border ${style.border} ${style.bg} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">{item.english}</p>
                  <h3 className="mt-1 text-sm font-bold text-white">{item.japanese}</h3>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border ${style.border} px-3 py-1 text-xs font-black ${style.text}`}>
                  <i className={`size-2 rounded-full ${style.dot}`} />{item.range}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max(5, item.score)}%` }} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">{item.comment}</p>
              <p className="mt-3 font-mono text-[9px] text-slate-600">DATA {item.coverage}/{item.total} · 信頼度 {item.confidence}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function IgnitionDistancePanel({ model }: { model: EarlyWarningModel }) {
  return (
    <section id="ignition-distance" className="scroll-mt-24 rounded-3xl border border-orange-300/20 bg-[linear-gradient(145deg,rgba(20,19,30,0.96),rgba(3,10,24,0.98))] p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-orange-300">IGNITION DISTANCE</p>
        <h2 className="mt-1 text-xl font-bold text-white">点火までの距離</h2>
        <p className="mt-2 text-xs leading-6 text-slate-400">信用・流動性の最重要指標が、次の警戒線までどれだけ離れているかを表示します。</p>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {model.ignitionDistances.map((item) => {
          const level = signalLevel(item.signal);
          const style = levelStyle[level];
          return (
            <div key={item.id} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-white">{item.label}</strong>
                <span className={`flex items-center gap-2 text-[10px] font-bold ${item.signal === "unavailable" ? "text-slate-500" : style.text}`}>
                  <i className={`size-2 rounded-full ${item.signal === "unavailable" ? "bg-slate-600" : style.dot}`} />
                  {item.value === null ? "取得不可" : `現在 ${item.value.toFixed(item.decimals)}${item.unit}`}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-300">{item.nextLabel}</p>
              <p className={`mt-1 font-mono text-sm font-bold ${item.breached ? "text-rose-200" : "text-cyan-200"}`}>
                {item.distance === null ? "距離を計算できません" : item.breached ? "警戒線を通過" : `あと ${item.distance.toFixed(item.decimals)}${item.unit}`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RiskVelocityPanel({ model }: { model: EarlyWarningModel }) {
  const overallStyle = levelStyle[model.velocity.level];
  return (
    <section id="risk-velocity" className="scroll-mt-24 rounded-3xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(17,17,42,0.97),rgba(3,10,24,0.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-violet-300">RISK VELOCITY</p>
          <h2 className="mt-1 text-xl font-bold text-white">悪化角度</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">実測履歴がある指標だけで1日・7日・30日の変化を比較します。数値は「比較前 → 現在」と変化量です。</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border ${overallStyle.border} ${overallStyle.bg} px-4 py-2 text-sm font-black ${overallStyle.text}`}>
          <i className={`size-2.5 rounded-full ${overallStyle.dot}`} />{model.velocity.overall}
        </span>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {model.velocity.periods.map((period) => {
          const style = levelStyle[period.level];
          return (
            <article key={period.days} className={`rounded-2xl border ${style.border} ${style.bg} p-4 sm:p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <strong className="font-mono text-xl text-white">{period.period}</strong>
                  <p className="mt-1 text-[11px] text-slate-500">比較できた指標 {period.availableCount}件</p>
                </div>
                <span className={`rounded-full border ${style.border} px-3 py-1.5 text-xs font-bold ${style.text}`}>{period.availableCount ? period.label : "データ不足"}</span>
              </div>
              <div className="mt-4 space-y-3">
                {period.topChanges.length ? period.topChanges.map((change) => (
                  <div key={`${period.days}-${change.label}`} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-slate-100">{change.label}</strong>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${change.normalized > 0 ? "bg-rose-400/10 text-rose-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                        {change.normalized > 0 ? "リスク悪化" : change.normalized < 0 ? "改善" : "変化なし"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[13px] text-slate-300">
                        {metricValue(change.comparisonValue, change.decimals, change.unit)} → {metricValue(change.currentValue, change.decimals, change.unit)}
                      </span>
                      <strong className={`font-mono text-sm ${change.normalized > 0 ? "text-rose-200" : "text-emerald-200"}`}>
                        変化 {changeValue(change.change, change.unit)}
                      </strong>
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-600">比較日 {compactDate(change.comparisonDate)} → {compactDate(change.currentDate)}</p>
                  </div>
                )) : <p className="text-[11px] leading-5 text-slate-600">この期間を比較できる日付付き履歴がありません。</p>}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[10px] leading-5 text-slate-500">複数カテゴリが同時悪化、またはHY OAS・IG OAS・VIXが同時悪化した場合に「連鎖悪化」。脆弱性だけの悪化は点火扱いにしません。</p>
    </section>
  );
}

const checklistStyle = {
  met: { mark: "✓", label: "成立", className: "border-rose-400/20 bg-rose-400/[0.05] text-rose-100" },
  watch: { mark: "△", label: "接近", className: "border-amber-400/20 bg-amber-400/[0.05] text-amber-100" },
  not_met: { mark: "−", label: "未成立", className: "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-100" },
  unavailable: { mark: "?", label: "未取得", className: "border-slate-500/15 bg-slate-500/[0.035] text-slate-500" },
} as const;

export function CombinationChecklist({ model }: { model: EarlyWarningModel }) {
  return (
    <section id="combination-checklist" className="mt-6 scroll-mt-24">
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">COMBINATION CHECKLIST</p>
        <h2 className="mt-1 text-2xl font-bold text-white">危機条件の成立チェック</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">単独指標ではなく、危機タイプごとに条件がどこまで揃ったかを確認します。未取得は未成立に数えません。</p>
        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[11px] text-cyan-100/80">
          <i className="size-2 rounded-full bg-cyan-300" />
          無料公開API自動更新 {model.automation.availableCount}/{model.automation.totalCount}
          <span className="text-slate-500">FREDは月次公表時、FDICは1時間ごとに再確認</span>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {model.checklists.map((group) => (
          <article key={group.id} className="rounded-3xl border border-white/[0.08] bg-[#07101f]/90 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] text-slate-500">{group.title.toUpperCase()}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{group.japanese}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-xs text-slate-300">成立 {group.metCount} / {group.availableCount}</span>
            </div>
            <div className="mt-4 space-y-2">
              {group.items.map((item) => {
                const style = checklistStyle[item.status];
                return (
                  <div key={item.label} className={`flex items-center gap-3 rounded-xl border p-3 ${style.className}`}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current/20 font-mono text-xs font-bold">{style.mark}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs text-slate-200">{item.label}</strong>
                      <small className="mt-1 block text-[10px] text-slate-500">{item.note}</small>
                      {item.updateFrequency && <small className="mt-1 block text-[9px] text-slate-600">更新: {item.updateFrequency}</small>}
                      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[9px] text-cyan-300/70 hover:text-cyan-200">データソース ↗</a>}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold">{style.label}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ThreeLayerSummary({
  model,
  contagion,
}: {
  model: EarlyWarningModel;
  contagion?: ContagionWatchData;
}) {
  return (
    <section id="classification-summary" className="mt-6 grid scroll-mt-24 gap-3 lg:grid-cols-3">
      {model.layers.map((layer) => {
        const unavailable = layer.signal === "unavailable";
        const style = levelStyle[signalLevel(layer.signal)];
        return (
          <article key={layer.id} className={`rounded-3xl border ${unavailable ? "border-slate-500/20" : style.border} bg-gradient-to-br from-white/[0.035] to-[#07101f] p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">{layer.english}</p>
                <h2 className="mt-1 text-xl font-bold text-white">{layer.japanese}</h2>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border ${unavailable ? "border-slate-500/20 text-slate-500" : `${style.border} ${style.text}`} px-3 py-1.5 text-xs font-bold`}>
                <i className={`size-2 rounded-full ${unavailable ? "bg-slate-600" : style.dot}`} />{layer.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{layer.description}</p>
            {layer.id === "ignition" && contagion?.ignitionPrecursor && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/[0.08] px-3 py-1.5 text-[10px] font-bold text-rose-100">
                <i className="size-2 rounded-full bg-rose-400" />
                HY OAS点火の予兆
              </p>
            )}
            {layer.id === "ignition" && model.leverageRollbackPrecursor && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.08] px-3 py-1.5 text-[10px] font-bold text-orange-100">
                <i className="size-2 rounded-full bg-orange-400" />
                レバレッジ巻き戻し開始
              </p>
            )}
            {layer.id === "ignition" && <p className="mt-3 text-[11px] leading-5 text-orange-100/70">既存Safety Valvesの機能低下を点火層として表示します。安全弁が緑なら未点火です。</p>}
            <p className="mt-4 border-t border-white/[0.06] pt-3 font-mono text-[10px] text-slate-600">ALERTS {layer.alertCount} / LIVE {layer.availableCount} / TOTAL {layer.totalCount}</p>
          </article>
        );
      })}
    </section>
  );
}

export function BubbleTriggerMonitor({ model }: { model: BubbleTriggerModel }) {
  const conversionStyle = levelStyle[signalLevel(model.conversionRisk.signal)];

  return (
    <section id="bubble-trigger-monitor" className="scroll-mt-24 rounded-[2rem] border border-sky-300/15 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_34%),linear-gradient(145deg,rgba(5,16,35,0.98),rgba(2,7,18,0.99))] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-sky-300">BUBBLE TRIGGER MONITOR</p>
          <h2 className="mt-1 text-2xl font-bold text-white">バブル崩壊・引き金タイプ判定</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-400">
            バブルの「燃料」と「点火」は別です。ここでは、流動性・金利で崩れる型と、信用市場が詰まって崩れる型を分けて監視します。
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border ${conversionStyle.border} ${conversionStyle.bg} px-4 py-2 text-xs font-black ${conversionStyle.text}`}>
          <i className={`size-2.5 rounded-full ${conversionStyle.dot}`} />
          {model.conversionRisk.label}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        {[model.dotcom, model.lehman].map((trigger) => {
          const style = levelStyle[signalLevel(trigger.signal)];
          return (
            <article key={trigger.id} className={`rounded-3xl border ${trigger.signal === "unavailable" ? "border-slate-500/20" : style.border} ${trigger.signal === "unavailable" ? "bg-slate-500/[0.025]" : style.bg} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">{trigger.title.toUpperCase()}</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{trigger.japanese}</h3>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border ${trigger.signal === "unavailable" ? "border-slate-500/20 text-slate-500" : `${style.border} ${style.text}`} px-3 py-1.5 text-xs font-bold`}>
                  <i className={`size-2 rounded-full ${trigger.signal === "unavailable" ? "bg-slate-600" : style.dot}`} />
                  {trigger.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{trigger.summary}</p>
              <p className="mt-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-xs leading-6 text-slate-400">{trigger.beginnerExplanation}</p>

              <div className="mt-4 space-y-2">
                {trigger.metrics.map((metric) => {
                  const metricStyle = levelStyle[signalLevel(metric.signal)];
                  return (
                    <details key={metric.name} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 text-xs">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="min-w-0">
                          <strong className="block truncate text-slate-100">{metric.name}</strong>
                          <small className="mt-1 block truncate font-mono text-slate-500">{metric.value}</small>
                        </span>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${metric.signal === "unavailable" ? "border-slate-500/20 text-slate-500" : `${metricStyle.border} ${metricStyle.text}`} px-2.5 py-1 text-[10px] font-bold`}>
                          <i className={`size-1.5 rounded-full ${metric.signal === "unavailable" ? "bg-slate-600" : metricStyle.dot}`} />
                          {signalCopy[metric.signal]}
                        </span>
                      </summary>
                      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-slate-500">
                        <p>基準: {metric.criteria}</p>
                        <p className="mt-1">取得元: {metric.sourceName} · {metric.observationDate ?? "観測日不明"}</p>
                        <p className="mt-1">更新: {metric.updateFrequency}</p>
                        {metric.sourceUrl && <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-cyan-300/70 hover:text-cyan-200">ソースを開く ↗</a>}
                      </div>
                    </details>
                  );
                })}
              </div>
            </article>
          );
        })}

        <aside className={`rounded-3xl border ${conversionStyle.border} ${conversionStyle.bg} p-5`}>
          <p className="text-[9px] font-bold tracking-[0.14em] text-slate-500">CONVERSION WATCH</p>
          <h3 className="mt-1 text-lg font-bold text-white">流動性型 → 信用型の転化</h3>
          <p className={`mt-4 inline-flex items-center gap-2 rounded-full border ${conversionStyle.border} px-3 py-1.5 text-xs font-black ${conversionStyle.text}`}>
            <i className={`size-2 rounded-full ${conversionStyle.dot}`} />
            {model.conversionRisk.active ? "転化リスク点灯" : "転化未確認"}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{model.conversionRisk.summary}</p>
          <p className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-xs leading-6 text-slate-400">{model.dominant}</p>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-[11px] leading-5 text-slate-500">{model.boeThresholdNote.label}</p>
            <a href={model.boeThresholdNote.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-cyan-300/70 hover:text-cyan-200">
              {model.boeThresholdNote.sourceName} ↗
            </a>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        表示は投資助言や価格予測ではありません。脆弱性が高くても、信用・流動性の点火層が悪化しない限り、金融危機判定にはしません。
      </p>
    </section>
  );
}

export function CrisisRouteTracker({ model }: { model: EarlyWarningModel }) {
  return (
    <section id="crisis-route-tracker" className="scroll-mt-24 rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.07),transparent_34%),linear-gradient(145deg,rgba(7,20,39,0.98),rgba(2,7,18,0.99))] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">CRISIS ROUTE TRACKER</p>
          <h2 className="mt-1 text-2xl font-bold text-white">危機ルート進行状況</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-400">各段階の実測信号を横一列で表示します。「現在地」は先頭から注意以上が連続した位置だけを示し、途中だけ悪化した場合は経路進行に数えません。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
          {(["green", "yellow", "orange", "red", "unavailable"] as Signal[]).map((signal) => {
            const style = levelStyle[signalLevel(signal)];
            return <span key={signal} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1.5"><i className={`size-2 rounded-full ${signal === "unavailable" ? "bg-slate-600" : style.dot}`} />{signalCopy[signal]}</span>;
          })}
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {model.routes.map((route) => {
          const style = levelStyle[signalLevel(route.signal)];
          return (
            <article key={route.id} className={`rounded-3xl border ${route.signal === "unavailable" ? "border-slate-500/20" : style.border} bg-black/20 p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.12em] text-slate-500">{route.title.toUpperCase()}</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{route.japanese}</h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {route.detachedAlertCount > 0 && <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1.5 text-[10px] font-bold text-amber-100">単独注意 {route.detachedAlertCount}段階</span>}
                  <span className={`inline-flex items-center gap-2 rounded-full border ${route.signal === "unavailable" ? "border-slate-500/20 text-slate-500" : `${style.border} ${style.text}`} px-3 py-1.5 text-xs font-bold`}>
                    <i className={`size-2 rounded-full ${route.signal === "unavailable" ? "bg-slate-600" : style.dot}`} />{route.progressLabel}
                  </span>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto pb-2 [scrollbar-color:rgba(34,211,238,0.25)_transparent]">
                <div className="grid min-w-[1080px] grid-cols-5 gap-3">
                  {route.nodes.map((node, index) => {
                    const nodeStyle = levelStyle[signalLevel(node.signal)];
                    const current = index === route.currentIndex;
                    const detached = index > route.currentIndex && node.signal !== "green" && node.signal !== "unavailable";
                    return (
                      <div key={node.label} className={`relative min-h-52 rounded-2xl border ${node.signal === "unavailable" ? "border-slate-500/20" : nodeStyle.border} ${node.signal === "unavailable" ? "bg-slate-500/[0.025]" : nodeStyle.bg} p-3.5`}>
                        {index < route.nodes.length - 1 && <span aria-hidden="true" className="absolute -right-3 top-10 z-10 grid size-6 place-items-center rounded-full border border-white/10 bg-[#07101f] text-xs text-slate-600">→</span>}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-slate-500">STAGE {index + 1}</span>
                          {current
                            ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] px-2 py-1 text-[9px] font-bold text-cyan-100">現在地</span>
                            : detached
                              ? <span className="rounded-full border border-amber-300/20 px-2 py-1 text-[9px] font-bold text-amber-100">単独注意</span>
                              : null}
                        </div>
                        <h4 className="mt-2 min-h-10 text-sm font-bold leading-5 text-white">{node.label}</h4>
                        <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border ${node.signal === "unavailable" ? "border-slate-500/20 text-slate-500" : `${nodeStyle.border} ${nodeStyle.text}`} px-2.5 py-1 text-[10px] font-bold`}>
                          <i className={`size-2 rounded-full ${node.signal === "unavailable" ? "bg-slate-600" : nodeStyle.dot}`} />{signalCopy[node.signal]}
                        </span>
                        <div className="mt-3 space-y-1.5">
                          {node.metrics.map((metric) => (
                            <div key={metric.name} className="flex items-start justify-between gap-2 text-[10px]">
                              <span className="line-clamp-2 text-slate-500">{metric.name}</span>
                              <strong className="shrink-0 font-mono text-slate-200">{metric.value}</strong>
                            </div>
                          ))}
                        </div>
                        <details className="mt-3 border-t border-white/[0.06] pt-2 text-[10px]">
                          <summary className="cursor-pointer font-bold text-cyan-200/75">基準・取得元</summary>
                          <p className="mt-2 leading-5 text-slate-500">{node.basis}</p>
                          <div className="mt-2 space-y-3">
                            {node.metrics.map((metric) => (
                              <div key={`${metric.name}-source`} className="rounded-lg bg-black/20 p-2">
                                <strong className="text-slate-300">{metric.name}</strong>
                                <p className="mt-1 leading-4 text-slate-500">基準: {metric.criteria}</p>
                                <p className="mt-1 leading-4 text-slate-600">{metric.source} · {metric.dataMode} · {metric.observationDate ?? "観測日不明"}</p>
                                <p className="mt-1 leading-4 text-slate-600">更新: {metric.updateFrequency}</p>
                                {metric.sourceUrl && <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-cyan-300/70 hover:text-cyan-200">ソースを開く ↗</a>}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-500">ルールベースの監視表示であり、因果関係や危機発生を確定するものではありません。各段階の詳細を開くと、現在値・基準・取得元・観測日を確認できます。</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
