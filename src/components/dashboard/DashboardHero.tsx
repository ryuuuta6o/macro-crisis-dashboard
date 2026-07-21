import Link from "next/link";
import type {
  IndicatorValue,
  OverallSignal,
  RiskLevel,
} from "@/types/indicator";
import { CompactGlobe } from "@/components/globe/CompactGlobe";
import type { GlobeHeroData } from "@/types/globe";

const stateLabel: Record<RiskLevel, string> = {
  green: "STABLE",
  yellow: "MODERATE",
  orange: "ELEVATED",
  red: "HIGH RISK",
};

export function DashboardHero({
  indicators,
  signal,
  level,
  fetchedAt,
  globeData,
}: {
  indicators: IndicatorValue[];
  signal: OverallSignal;
  level: RiskLevel;
  fetchedAt: string;
  globeData: GlobeHeroData;
}) {
  const alerts = indicators.filter(
    (item) =>
      item.signal === "red" ||
      item.signal === "orange" ||
      item.signal === "yellow",
  ).length;
  const live = indicators.filter((item) => item.signal !== "unavailable").length;
  const creditPulse = indicators.find((item) => item.id === "hy-oas");
  const ratesPulse = indicators.find((item) => item.id === "dgs30");
  const liquidityPulse = indicators.find((item) => item.id === "sofr");

  return (
    <header className="public-dashboard-hero terminal-heading premium-readable-hero premium-reference-hero mb-4">
      <div className="premium-reference-hero__movie" aria-hidden="true">
        <div className="premium-reference-hero__stars" />
        <CompactGlobe data={globeData} />
        <div className="premium-reference-hero__orbit premium-reference-hero__orbit--one" />
        <div className="premium-reference-hero__orbit premium-reference-hero__orbit--two" />
        <div className="premium-reference-hero__orbit premium-reference-hero__orbit--three" />
        <div className="premium-reference-hero__scan" />
      </div>
      <div className="premium-readable-hero__shade" aria-hidden="true" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="live-pill">
            <span className="live-pill-dot" />
            LIVE MARKET MONITOR
          </span>
          <span className={`risk-state-chip risk-state-chip--${level}`}>
            {stateLabel[level]}
          </span>
        </div>
        <p className="mt-4 text-center text-[10px] font-black tracking-[0.24em] text-cyan-300/75">
          GLOBAL MACRO EARLY WARNING
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
          Macro Risk Signal Dashboard
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm font-medium leading-7 tracking-[0.04em] text-slate-300 sm:text-base">
          お金の流れ・安全弁・警告サイン・脆弱性を一目で把握
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[10px] tabular-nums text-slate-500">
          <span>
            WATCH <b className="text-orange-300">{String(alerts).padStart(2, "0")}</b>
          </span>
          <span>
            LIVE <b className="text-emerald-300">{live}/{indicators.length}</b>
          </span>
          <span>
            UPDATED <b className="text-cyan-200">{formatFetchedAt(fetchedAt)} JST</b>
          </span>
          <span>
            SIGNAL <b className="text-white">{signal.toUpperCase()}</b>
          </span>
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            href="/weather"
            className="inline-flex min-h-10 items-center rounded-full border border-cyan-200/20 bg-cyan-200/[0.075] px-4 py-2 text-xs font-bold text-cyan-100 backdrop-blur-md transition hover:border-cyan-200/35 hover:bg-cyan-200/[0.12]"
          >
            数字を使わない初心者向け「世界経済天気予報」へ →
          </Link>
        </div>

        <div className="premium-readable-hero__pulses">
          <HeroPulse label="Credit" item={creditPulse} />
          <HeroPulse label="Rates" item={ratesPulse} />
          <HeroPulse label="Liquidity" item={liquidityPulse} />
        </div>
      </div>
    </header>
  );
}

function HeroPulse({ label, item }: { label: string; item?: IndicatorValue }) {
  const color = item?.signal === "red" ? "#fb7185" : item?.signal === "orange" ? "#fb923c" : item?.signal === "yellow" ? "#facc15" : "#4ade80";
  return (
    <a href={item ? `#indicator-${item.id}` : "#signals"} className="premium-readable-hero__pulse">
      <div className="flex items-center justify-between gap-3">
        <span>
          <small>{label.toUpperCase()}</small>
          <strong>{item?.name ?? "データ待ち"}</strong>
        </span>
        <span>
          <i className="size-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
          {item ? formatIndicatorValue(item) : "--"}
        </span>
      </div>
    </a>
  );
}

function formatIndicatorValue(item: IndicatorValue) {
  if (item.numericValue === null) return item.value === null ? "--" : String(item.value);
  return `${item.numericValue.toFixed(item.decimals)}${item.unit}`;
}

function formatFetchedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
