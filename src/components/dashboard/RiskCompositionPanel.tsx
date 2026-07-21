"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  RiskCompositionIndicator,
  RiskCompositionModel,
  RiskMeterItem,
} from "@/lib/risk-composition";
import type { Signal } from "@/types/indicator";

const signalMeta: Record<Signal, { color: string; label: string }> = {
  green: { color: "#3FB950", label: "緑" },
  yellow: { color: "#D29922", label: "黄" },
  orange: { color: "#D97706", label: "橙" },
  red: { color: "#F85149", label: "赤" },
  unavailable: { color: "#64748B", label: "未取得" },
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

export function RiskCompositionPanel({ model }: { model: RiskCompositionModel }) {
  const initialId = useMemo(
    () =>
      [...model.meters].sort(
        (left, right) => (right.score ?? -1) - (left.score ?? -1),
      )[0]?.id ?? "credit-market",
    [model.meters],
  );
  const [selectedId, setSelectedId] = useState(initialId);

  useEffect(() => {
    const selectFromHash = () => {
      const meterPrefix = "#risk-meter-";
      const legacyPrefix = "#risk-composition-";
      const hash = window.location.hash;
      const requested = hash.startsWith(meterPrefix)
        ? hash.slice(meterPrefix.length)
        : hash.startsWith(legacyPrefix)
          ? hash.slice(legacyPrefix.length)
          : null;
      if (!requested) return;
      const legacyMeterMap: Record<string, string> = {
        "equity-overheat": "equity-vulnerability",
        "credit-market": "credit-market",
        "rates-treasury": "rates-treasury",
        "economic-slowdown": "economic-employment",
        "bank-liquidity": "short-term-liquidity",
        "geopolitical-other": "geopolitical-other",
      };
      const meterId = legacyMeterMap[requested] ?? requested;
      const match = model.meters.find((meter) => meter.id === meterId);
      if (match) setSelectedId(match.id);
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [model.meters]);
  const selected =
    model.meters.find((meter) => meter.id === selectedId) ?? model.meters[0];
  const selectMeter = (meterId: string) => {
    setSelectedId(meterId);
    window.requestAnimationFrame(() => {
      document.getElementById("risk-meter-detail")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="rounded-xl border border-sky-300/[0.12] bg-[#071525] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-cyan-300/75">
            SHARED MODEL / LIVE COMPOSITION
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
            Risk Composition / リスク構成
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            信号色を重要度で重み付けし、現在のリスク圧力をカテゴリ別に正規化しています。確率や価格予測ではありません。
          </p>
        </div>
        <time className="font-mono text-[10px] text-slate-500" dateTime={model.generatedAt}>
          CALCULATED {formatDate(model.generatedAt)}
        </time>
      </div>

      {model.calm ? (
        <div className="mt-5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-sm text-emerald-100">
          有効な警戒信号の寄与は現在ほぼありません。取得不可データは0点として補完せず、別表示しています。
        </div>
      ) : (
        <div className="mt-5 flex h-3 overflow-hidden rounded-sm bg-white/[0.04]" aria-label="リスク構成比">
          {model.categories
            .filter((category) => category.contribution > 0)
            .map((category) => (
              <span
                key={category.id}
                aria-label={`${category.name} ${category.contribution}%`}
                title={`${category.name} ${category.contribution}%`}
                style={{
                  width: `${category.contribution}%`,
                  backgroundColor: signalMeta[category.signal].color,
                  opacity: 0.78,
                }}
                className="min-w-1"
              />
            ))}
        </div>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-300">{model.summary}</p>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-b border-white/[0.07] pb-4">
        {model.categories.map((category) => (
          <span key={category.id} className="flex items-center gap-2 text-xs text-slate-400">
            <i className="size-1.5 rounded-full" style={{ backgroundColor: signalMeta[category.signal].color }} />
            {category.name}
            <b className="font-mono text-slate-200">{category.contribution}%</b>
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white sm:text-xl">全リスクメーター</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            バーを押すと、構成する実データ・推移・判定ラインを下に表示します。
          </p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500">
          0〜100は信号色の重要度加重です。危機確率や価格予測ではありません。
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {model.meters.map((meter) => (
          <RiskMeterButton
            key={meter.id}
            meter={meter}
            active={meter.id === selectedId}
            onClick={() => selectMeter(meter.id)}
          />
        ))}
      </div>

      {selected && <MeterDetail meter={selected} />}
    </section>
  );
}

function RiskMeterButton({
  meter,
  active,
  onClick,
}: {
  meter: RiskMeterItem;
  active: boolean;
  onClick: () => void;
}) {
  const meta = signalMeta[meter.signal];
  const score = meter.score ?? 0;
  const markerPosition = Math.min(99, Math.max(1, score));
  const directionMark = meter.direction === "worse" ? "↗" : meter.direction === "better" ? "↘" : "→";
  const directionTone = meter.direction === "worse"
    ? "text-rose-300"
    : meter.direction === "better"
      ? "text-emerald-300"
      : "text-slate-500";
  return (
    <button
      id={`risk-meter-${meter.id}`}
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`scroll-mt-28 rounded-xl border p-4 text-left transition duration-200 sm:p-5 ${
        active
          ? "border-cyan-300/40 bg-cyan-300/[0.065] shadow-[inset_3px_0_0_rgba(103,232,249,0.65)]"
          : "border-white/[0.08] bg-black/20 hover:border-white/15 hover:bg-white/[0.025]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-white sm:text-lg">{meter.name}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">{meter.componentLabel}</p>
        </div>
        <span className="shrink-0 rounded border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[10px] text-slate-400">
          {meter.availableCount}/{meter.totalCount}
        </span>
      </div>

      <div
        role="meter"
        aria-label={`${meter.name}のリスクメーター`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={meter.score ?? undefined}
        className="relative mt-4 h-3.5 overflow-hidden rounded-full border border-white/[0.06] bg-slate-800/80"
      >
        {[25, 50, 75].map((position) => (
          <span key={position} className="absolute inset-y-[-2px] z-10 w-px bg-white/20" style={{ left: `${position}%` }} />
        ))}
        <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${score}%`, background: signalBar[meter.signal] }} />
        {meter.score !== null && (
          <span className="absolute top-1/2 z-20 h-5 w-px -translate-y-1/2 bg-white/80" style={{ left: `${markerPosition}%` }} />
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="flex items-end gap-2.5">
          <strong className="font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">{meter.score ?? "--"}</strong>
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: meta.color }}>
            <i className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {signalStatus[meter.signal]}
          </span>
        </div>
        <span className={`mb-1 text-xs font-bold ${directionTone}`}>{directionMark} {meter.directionLabel}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-xs text-slate-500">{meter.description}</span>
        <span className="shrink-0 text-xs font-bold text-cyan-200">{active ? "表示中" : "データを見る"} →</span>
      </div>
    </button>
  );
}

function MeterDetail({ meter }: { meter: RiskMeterItem }) {
  const meta = signalMeta[meter.signal];
  return (
    <div id="risk-meter-detail" className="mt-5 scroll-mt-28 rounded-xl border border-cyan-300/[0.14] bg-black/25 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-cyan-300/60">LIVE DATA DRILLDOWN / {meter.id.toUpperCase()}</p>
          <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">{meter.name}の構成データ</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{meter.componentLabel}を構成する現在値と判定ラインです。取得できない値は推測で補完しません。</p>
        </div>
        <span
          className="rounded border px-2.5 py-1 font-mono text-[10px]"
          style={{ color: meta.color, borderColor: `${meta.color}55` }}
        >
          SCORE {meter.score ?? "--"} / {signalStatus[meter.signal]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {meter.indicators.map((indicator) => (
          <CompositionIndicatorCard key={indicator.id} indicator={indicator} />
        ))}
        {meter.indicators.length === 0 && meter.id === "geopolitical-other" && (
          <article className="rounded-lg border border-slate-500/15 bg-slate-500/[0.035] p-4">
            <h4 className="text-sm font-bold text-slate-300">世界リスク手動データ</h4>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              国・地域別の地政学項目を集約しています。個別の根拠は世界リスクマップで確認できます。
            </p>
            <a href="/global-risk" className="mt-4 inline-flex text-xs font-bold text-cyan-300">
              世界リスクの詳細へ →
            </a>
          </article>
        )}
        {meter.indicators.length === 0 && meter.id !== "geopolitical-other" && (
          <article className="rounded-lg border border-slate-500/15 bg-slate-500/[0.035] p-4">
            <h4 className="text-sm font-bold text-slate-300">構成データを取得できません</h4>
            <p className="mt-3 text-xs leading-5 text-slate-500">現在の取得元から値を確認できないため、推測値は表示していません。</p>
          </article>
        )}
      </div>
    </div>
  );
}

function CompositionIndicatorCard({ indicator }: { indicator: RiskCompositionIndicator }) {
  const meta = signalMeta[indicator.signal];
  return (
    <article className="rounded-lg border border-white/[0.075] bg-[#09182b] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.12em] text-slate-500">
            {indicator.fredSeries.join(" / ") || indicator.source.toUpperCase()}
          </p>
          <h4 className="mt-1 text-sm font-bold text-white">{indicator.name}</h4>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: meta.color }}>
          <i className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <strong className="font-mono text-2xl text-white">{formatValue(indicator)}</strong>
        <span className="font-mono text-[9px] text-slate-500">{indicator.observationDate ?? "未更新"}</span>
      </div>

      <div className="mt-3 h-14 rounded border border-white/[0.05] bg-black/20 p-1.5">
        <HistorySparkline indicator={indicator} color={meta.color} />
      </div>

      <ThresholdBar indicator={indicator} color={meta.color} />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <div className="min-w-0">
          <span className="line-clamp-2 text-[10px] leading-4 text-slate-500">{indicator.thresholdLabel}</span>
          <p className="mt-1 truncate font-mono text-[8px] text-slate-600">
            SOURCE {indicator.sourceName ?? indicator.source} · UPDATED {indicator.observationDate ?? "未更新"}
          </p>
        </div>
        <a href={`/#indicator-${indicator.id}`} className="shrink-0 text-[10px] font-bold text-cyan-300">
          詳細へ →
        </a>
      </div>
    </article>
  );
}

function HistorySparkline({ indicator, color }: { indicator: RiskCompositionIndicator; color: string }) {
  const history = [...indicator.history]
    .filter((point) => Number.isFinite(point.value))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-12);
  if (history.length < 2) {
    return <div className="grid h-full place-items-center text-[9px] text-slate-600">履歴データ不足</div>;
  }
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, Math.abs(max) * 0.01, 0.01);
  const points = history
    .map((point, index) => {
      const x = (index / (history.length - 1)) * 212 + 4;
      const y = 43 - ((point.value - min) / range) * 36;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 220 48" preserveAspectRatio="none" className="h-full w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ThresholdBar({ indicator, color }: { indicator: RiskCompositionIndicator; color: string }) {
  if (!indicator.threshold || indicator.numericValue === null) return null;
  const { yellowAt, redAt } = indicator.threshold;
  const upper = Math.max(Math.abs(indicator.numericValue), Math.abs(yellowAt), Math.abs(redAt), 0.01) * 1.25;
  const marker = Math.max(2, Math.min(98, (Math.abs(indicator.numericValue) / upper) * 100));
  return (
    <div className="mt-3">
      <div className="relative flex h-1.5 overflow-hidden rounded-sm">
        <span className="w-1/3 bg-emerald-500/55" />
        <span className="w-1/3 bg-yellow-500/55" />
        <span className="w-1/3 bg-rose-500/55" />
        <i
          className="absolute -top-1 h-3.5 w-px bg-white shadow-[0_0_5px_white]"
          style={{ left: `${marker}%`, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[8px] text-slate-600">THRESHOLD POSITION</p>
    </div>
  );
}

function formatValue(indicator: RiskCompositionIndicator) {
  if (indicator.numericValue !== null) {
    return `${indicator.numericValue.toLocaleString("ja-JP", {
      minimumFractionDigits: indicator.decimals,
      maximumFractionDigits: indicator.decimals,
    })}${indicator.unit}`;
  }
  return indicator.value === null ? "取得不可" : String(indicator.value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時刻不明";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
