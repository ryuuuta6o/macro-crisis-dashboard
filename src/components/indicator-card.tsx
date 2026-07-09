import { SignalBadge } from "@/components/signal-badge";
import { TiltCard } from "@/components/effects/TiltCard";
import {
  IMPORTANCE_LABELS,
  TYPE_LABELS,
} from "@/lib/indicators";
import {
  formatIndicatorValue,
  getIndicatorReasons,
  signalLabel,
} from "@/lib/decision-support";
import type { IndicatorValue, Signal } from "@/types/indicator";
import { createSparkline, sparklinePoints } from "@/lib/mock-sparklines";
import { getIndicatorGlossary } from "@/lib/indicator-glossary";
import { MARGIN_DEBT_M2_CONFIG } from "@/config/manual-data";
import { detectMarginDebtM2Peakout } from "@/lib/margin-debt-m2";

const signalBorder: Record<Signal, string> = {
  green: "before:bg-[#3FB950]",
  yellow: "before:bg-[#D29922]",
  orange: "before:bg-[#D97706]",
  red: "before:bg-[#F85149]",
  unavailable: "before:bg-slate-600",
};

const signalSurface: Record<Signal, string> = {
  green:
    "border-emerald-400/30 bg-[linear-gradient(145deg,rgba(6,78,59,0.20),rgba(7,19,35,0.97))]",
  yellow:
    "border-yellow-400/30 bg-[linear-gradient(145deg,rgba(113,63,18,0.22),rgba(7,19,35,0.97))]",
  orange:
    "border-orange-400/35 bg-[linear-gradient(145deg,rgba(124,45,18,0.24),rgba(7,19,35,0.97))]",
  red:
    "border-rose-400/35 bg-[linear-gradient(145deg,rgba(127,29,29,0.25),rgba(7,19,35,0.97))]",
  unavailable:
    "border-slate-500/25 bg-[linear-gradient(145deg,rgba(51,65,85,0.16),rgba(7,19,35,0.97))]",
};

const importanceClass = {
  critical: "border-white/[0.08] bg-white/[0.025] text-slate-300",
  important: "border-white/[0.08] bg-white/[0.025] text-slate-300",
  ignition: "border-white/[0.08] bg-white/[0.025] text-slate-300",
  supporting: "border-white/[0.08] bg-white/[0.025] text-slate-400",
};

const typeClass = {
  safety_valve: "border-white/[0.08] bg-white/[0.025] text-slate-300",
  warning_signal: "border-white/[0.08] bg-white/[0.025] text-slate-300",
  vulnerability: "border-white/[0.08] bg-white/[0.025] text-slate-300",
};

function TrendIcon({
  change,
  lowerIsWorse,
}: {
  change: number | null;
  lowerIsWorse: boolean;
}) {
  if (change === null || Math.abs(change) < 0.0001) {
    return <span className="text-slate-500">→</span>;
  }
  const worsening = lowerIsWorse ? change < 0 : change > 0;
  return (
    <span className={worsening ? "text-red-300" : "text-green-300"}>
      {change > 0 ? "↗" : "↘"}
    </span>
  );
}

function MarginDebtM2Sparkline({
  indicator,
  color,
}: {
  indicator: IndicatorValue;
  color: string;
}) {
  if (indicator.history.length < 2) {
    return (
      <svg viewBox="0 0 240 62" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <polyline points={sparklinePoints(createSparkline(indicator.id, 20, 0.08), 240, 62)} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }

  const ordered = [...indicator.history].reverse();
  const references = [
    { value: MARGIN_DEBT_M2_CONFIG.lehmanPeakPct, label: "5.73" },
    { value: MARGIN_DEBT_M2_CONFIG.itBubblePeakPct, label: "6.35" },
  ];
  const values = [...ordered.map((point) => point.value), ...references.map((item) => item.value)];
  const min = Math.min(...values) - 0.12;
  const max = Math.max(...values) + 0.12;
  const scaleY = (value: number) => 58 - ((value - min) / Math.max(0.01, max - min)) * 52;
  const pointString = ordered
    .map((point, index) => {
      const x = ordered.length === 1 ? 0 : (index / (ordered.length - 1)) * 232 + 4;
      return `${x.toFixed(1)},${scaleY(point.value).toFixed(1)}`;
    })
    .join(" ");
  const latest = ordered.at(-1)!;
  const latestX = 236;
  const latestY = scaleY(latest.value);
  const peak = ordered.reduce((highest, point) => (point.value > highest.value ? point : highest), ordered[0]);
  const peakIndex = ordered.findIndex((point) => point.date === peak.date);
  const peakX = ordered.length === 1 ? 4 : (peakIndex / (ordered.length - 1)) * 232 + 4;
  const peakY = scaleY(peak.value);

  return (
    <svg viewBox="0 0 240 62" preserveAspectRatio="none" className="h-full w-full overflow-visible">
      {references.map((reference) => {
        const y = scaleY(reference.value);
        return (
          <g key={reference.label}>
            <line x1="4" x2="236" y1={y} y2={y} stroke="#93c5fd" strokeOpacity="0.28" strokeDasharray="3 4" />
            <text x="238" y={y + 2} fill="#93c5fd" fillOpacity="0.65" fontSize="6" textAnchor="end">
              {reference.label}
            </text>
          </g>
        );
      })}
      <polyline points={pointString} fill="none" stroke={color} strokeWidth="2.2" />
      <circle cx={peakX} cy={peakY} r="2.2" fill="#facc15" opacity="0.95" />
      <line x1={latestX} x2={latestX} y1="3" y2="59" stroke={color} strokeOpacity="0.42" />
      <circle cx={latestX} cy={latestY} r="2.6" fill={color} />
    </svg>
  );
}

export function IndicatorCard({
  indicator,
  index,
  allIndicators,
}: {
  indicator: IndicatorValue;
  index: number;
  allIndicators: IndicatorValue[];
}) {
  const change =
    indicator.numericValue === null || indicator.previousNumericValue === null
      ? null
      : indicator.numericValue - indicator.previousNumericValue;
  const formattedValue =
    indicator.numericValue !== null
      ? indicator.numericValue.toLocaleString("ja-JP", {
          minimumFractionDigits: indicator.decimals,
          maximumFractionDigits: indicator.decimals,
        })
      : typeof indicator.value === "string"
        ? indicator.value
        : "取得不可";
  const formattedChange =
    change === null
      ? indicator.signal === "unavailable"
        ? "データなし"
        : "前回値なし"
      : `${change >= 0 ? "+" : ""}${change.toFixed(indicator.decimals)}${indicator.unit}`;
  const sourceLabel =
    indicator.sourceLabel
      ? indicator.sourceLabel
      : indicator.source === "FRED"
      ? `FRED API · ${indicator.fredSeries.join(" / ")}`
      : indicator.source === "fiscal-data"
        ? "U.S. Treasury Fiscal Data API"
        : indicator.source === "treasury"
          ? "U.S. Treasury"
          : indicator.source === "ny-fed"
            ? "Federal Reserve Bank of New York"
            : indicator.source === "market-data"
              ? "Market data"
              : indicator.source === "published"
                ? "Latest published report"
      : indicator.source === "manual"
        ? "手動JSON"
        : "取得不可";
  const reasons = getIndicatorReasons(indicator, allIndicators);
  const glossary = getIndicatorGlossary(indicator.id);
  const chartColor =
    indicator.signal === "red"
      ? "#F85149"
      : indicator.signal === "orange"
        ? "#D97706"
        : indicator.signal === "yellow"
        ? "#D29922"
        : indicator.signal === "green"
          ? "#3FB950"
          : "#64748b";
  const sparkline = sparklinePoints(
    createSparkline(
      indicator.id,
      20,
      change === null ? 0 : change > 0 ? 0.1 : -0.1,
    ),
    240,
    62,
  );
  const marginDebtM2Peakout =
    indicator.id === "margin-debt-m2"
      ? detectMarginDebtM2Peakout(indicator.history)
      : null;

  return (
    <TiltCard className={`relative overflow-hidden rounded-lg border before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${signalBorder[indicator.signal]} ${signalSurface[indicator.signal]}`}>
    <article id={`indicator-${indicator.id}`} className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
            SIGNAL {String(index + 1).padStart(2, "0")} · {indicator.shortName}
          </p>
          <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            {indicator.name}
          </h3>
          <p className="mt-1 text-xs font-medium text-cyan-200/80">
            かんたんに言うと：
            {indicator.beginnerExplanation ?? glossary.plainName}
          </p>
        </div>
        <SignalBadge signal={indicator.signal} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold tracking-[0.12em] ${typeClass[indicator.type]}`}
        >
          {TYPE_LABELS[indicator.type]}
        </span>
        <span
          className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold tracking-[0.12em] ${importanceClass[indicator.importance]}`}
        >
          重要度：{IMPORTANCE_LABELS[indicator.importance]}
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`font-mono font-semibold tracking-[-0.05em] text-white ${
              indicator.numericValue === null ? "text-2xl" : "text-4xl sm:text-5xl"
            }`}
          >
            {formattedValue}
            {indicator.numericValue !== null && (
              <span className="ml-2 text-base tracking-normal text-slate-400">
                {indicator.unit}
              </span>
            )}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <TrendIcon
              change={change}
              lowerIsWorse={indicator.thresholdDirection === "lower-is-worse"}
            />
            <span className="font-mono text-slate-300">{formattedChange}</span>
            <span className="text-slate-600">前回比</span>
          </div>
        </div>
        <p className="shrink-0 text-right text-[10px] leading-5 text-slate-500">
          最終更新
          <br />
          {indicator.observationDate ? (
            <time dateTime={indicator.observationDate}>
              {indicator.observationDate.replaceAll("-", ".")}
            </time>
          ) : (
            "未更新"
          )}
        </p>
      </div>

      <div className="mt-5 h-20 overflow-hidden rounded-md border border-sky-200/[0.08] bg-[#07182a]/85 p-2">
        {indicator.id === "margin-debt-m2" ? (
          <MarginDebtM2Sparkline indicator={indicator} color={chartColor} />
        ) : (
          <svg viewBox="0 0 240 62" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <polyline points={sparkline} fill="none" stroke={chartColor} strokeWidth="2" />
          </svg>
        )}
      </div>

      {marginDebtM2Peakout && (
        <div className="mt-3 rounded-md border border-orange-300/20 bg-orange-300/[0.055] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.16em] text-orange-100">
              PEAKOUT WATCH
            </p>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${marginDebtM2Peakout.detected ? "border-rose-300/30 text-rose-100" : "border-orange-300/25 text-orange-100"}`}>
              {marginDebtM2Peakout.label}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {marginDebtM2Peakout.note}
          </p>
          {marginDebtM2Peakout.previousHighValue !== null && (
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              3カ月高値 {marginDebtM2Peakout.previousHighValue.toFixed(2)}%
              （{marginDebtM2Peakout.previousHighDate}）から
              {marginDebtM2Peakout.dropFromHighPctPoint !== null
                ? ` ${marginDebtM2Peakout.dropFromHighPctPoint.toFixed(2)}pt低下`
                : " 判定中"}
            </p>
          )}
        </div>
      )}

      <p className="mt-6 border-t border-white/[0.07] pt-5 text-sm leading-7 text-slate-300">
        {indicator.beginnerExplanation ?? glossary.shortDefinition}
      </p>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        この数値：{glossary.measuredValue}
      </p>

      {(indicator.whyItMatters || indicator.cautionComment) && (
        <div className="mt-4 rounded-md border border-sky-200/[0.08] bg-[#07182a]/85 p-4">
          {indicator.whyItMatters && (
            <>
              <p className="text-[10px] font-bold tracking-[0.16em] text-rose-200">
                なぜ重要か
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-300">
                {indicator.whyItMatters}
              </p>
            </>
          )}
          {indicator.cautionComment && (
            <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-6 text-amber-100/90">
              注意：{indicator.cautionComment}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-md border border-sky-200/[0.08] bg-[#07182a]/85 p-4">
        <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400">
          変化理由
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-600">前回</p>
            <p className="mt-1 font-mono text-slate-300">
              {formatIndicatorValue(indicator, indicator.previousValue)}
              <span className="ml-2 text-slate-500">
                {signalLabel(indicator.previousSignal)}
              </span>
            </p>
          </div>
          <div>
            <p className="text-slate-600">今回</p>
            <p className="mt-1 font-mono text-white">
              {formatIndicatorValue(indicator, indicator.value)}
              <span className="ml-2 text-slate-400">
                {signalLabel(indicator.signal)}
              </span>
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-400">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-slate-500">・</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <details className="group mt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border border-sky-200/[0.08] bg-[#07182a]/85 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-sky-300/[0.06] hover:text-white">
          閾値とデータ元を見る
          <span className="text-lg transition-transform group-open:rotate-45">＋</span>
        </summary>
        <div className="mt-2 rounded-md border border-sky-200/[0.08] bg-[#07182a]/85 px-4 py-4">
          <p className="text-sm leading-6 text-slate-300">
            {indicator.thresholdLabel}
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            データ取得元：
            {indicator.sourceUrl ? (
              <a
                href={indicator.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                {sourceLabel}
              </a>
            ) : (
              sourceLabel
            )}
            {indicator.updateFrequency
              ? ` · 更新頻度：${indicator.updateFrequency}`
              : ""}
          </p>
        </div>
      </details>
    </article>
    </TiltCard>
  );
}

