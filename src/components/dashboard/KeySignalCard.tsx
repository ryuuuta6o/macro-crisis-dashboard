import { TiltCard } from "@/components/effects/TiltCard";
import { SignalBadge } from "@/components/signal-badge";
import { formatIndicatorValue } from "@/lib/decision-support";
import { createSparkline, sparklinePoints } from "@/lib/mock-sparklines";
import type { IndicatorValue } from "@/types/indicator";

export function KeySignalCard({ indicator }: { indicator: IndicatorValue }) {
  const change =
    indicator.numericValue === null || indicator.previousNumericValue === null
      ? null
      : indicator.numericValue - indicator.previousNumericValue;
  const color =
    indicator.signal === "red"
      ? "#ef4444"
      : indicator.signal === "orange"
        ? "#f97316"
      : indicator.signal === "yellow"
        ? "#eab308"
        : indicator.signal === "green"
          ? "#22c55e"
          : "#64748b";
  const points = sparklinePoints(
    createSparkline(indicator.id, 18, change && change > 0 ? 0.1 : -0.02),
    180,
    48,
  );

  return (
    <TiltCard className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/85 p-4 backdrop-blur-xl">
      <a href={`#indicator-${indicator.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-300">{indicator.name}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {formatIndicatorValue(indicator, indicator.value)}
            </p>
          </div>
          <SignalBadge signal={indicator.signal} />
        </div>
        <svg viewBox="0 0 180 48" preserveAspectRatio="none" className="mt-3 h-12 w-full">
          <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        </svg>
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span style={{ color }}>
            {change === null
              ? "データ待機"
              : `${change >= 0 ? "+" : ""}${change.toFixed(indicator.decimals)}${indicator.unit}`}
          </span>
          <span className="text-slate-600">詳細を見る →</span>
        </div>
      </a>
    </TiltCard>
  );
}
