"use client";

import { useEffect, useMemo, useState } from "react";
import { WorldRiskMap3D } from "@/components/global-risk/WorldRiskMap3D";
import type {
  GlobalRiskCategory,
  GlobalRiskData,
  GlobalRiskMembership,
  GlobalRiskRegion,
} from "@/types/global-risk";
import type { MarketNewsItem, RiskLevel } from "@/types/indicator";

type ViewFilter =
  | "all"
  | GlobalRiskMembership
  | GlobalRiskCategory;

const filters: Array<{ id: ViewFilter; label: string; group: string }> = [
  { id: "all", label: "すべて", group: "表示" },
  { id: "gdp_top_10", label: "GDP TOP 10", group: "表示" },
  { id: "g7", label: "G7", group: "表示" },
  { id: "regional_focus", label: "地域重点国", group: "表示" },
  { id: "semiconductor", label: "半導体地域", group: "表示" },
  { id: "interest", label: "金利", group: "リスク" },
  { id: "credit", label: "信用", group: "リスク" },
  { id: "real-estate", label: "不動産", group: "リスク" },
  { id: "geopolitical", label: "地政学", group: "リスク" },
  { id: "ai-semiconductor", label: "AI・半導体", group: "リスク" },
  { id: "liquidity", label: "流動性", group: "リスク" },
];

const memberships = new Set<GlobalRiskMembership>([
  "gdp_top_10",
  "g7",
  "regional_focus",
  "semiconductor",
]);

const levelStyle: Record<
  RiskLevel,
  { dot: string; text: string; border: string; label: string }
> = {
  green: {
    dot: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/25",
    label: "安定",
  },
  yellow: {
    dot: "bg-amber-400",
    text: "text-amber-100",
    border: "border-amber-400/25",
    label: "注意",
  },
  orange: {
    dot: "bg-orange-400",
    text: "text-orange-100",
    border: "border-orange-400/30",
    label: "警戒",
  },
  red: {
    dot: "bg-rose-400",
    text: "text-rose-100",
    border: "border-rose-400/35",
    label: "危険",
  },
};

export function GlobalRiskExplorer({
  data,
  news,
}: {
  data: GlobalRiskData;
  news: MarketNewsItem[];
}) {
  const [liveData, setLiveData] = useState(data);
  const [liveNews, setLiveNews] = useState(news);
  const [refreshState, setRefreshState] = useState<
    "loading" | "live" | "partial" | "fallback"
  >("loading");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [selectedId, setSelectedId] = useState(data.regions[0]?.id ?? "");

  useEffect(() => {
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch("/api/global-risk", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Global risk refresh failed");
        const nextData = (await response.json()) as GlobalRiskData;
        setLiveData(nextData);
        setRefreshState(nextData.dataStatus ?? "partial");
      } catch {
        if (!controller.signal.aborted) setRefreshState("fallback");
      }

      try {
        const response = await fetch("/api/news", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("News refresh failed");
        setLiveNews((await response.json()) as MarketNewsItem[]);
      } catch {
        // Keep the last valid news set when the live feed is unavailable.
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 300_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const visibleRegions = useMemo(
    () =>
      filter === "all"
        ? liveData.regions
        : memberships.has(filter as GlobalRiskMembership)
          ? liveData.regions.filter((region) =>
              region.memberships.includes(filter as GlobalRiskMembership),
            )
          : liveData.regions.filter((region) =>
              region.risks.some((risk) => risk.category === filter),
            ),
    [liveData.regions, filter],
  );
  const selected =
    visibleRegions.find((region) => region.id === selectedId) ??
    visibleRegions[0] ??
    null;

  function selectRegion(region: GlobalRiskRegion) {
    setSelectedId(region.id);
  }

  return (
    <>
      <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#07101f]/72 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">
              MAP FILTER
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              国・グループ・リスクで絞り込む
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            表示中 {visibleRegions.length}か国
          </p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition ${
                filter === item.id
                  ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.1)]"
                  : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:border-white/[0.14] hover:text-slate-100"
              }`}
            >
              <span className="mr-2 text-[10px] text-slate-600">
                {item.group}
              </span>
              {item.label}
            </button>
          ))}
        </div>
        <LiveDataStatus data={liveData} state={refreshState} />
      </section>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(390px,0.55fr)]">
        <WorldRiskMap3D
          regions={visibleRegions}
          selectedId={selected?.id ?? ""}
          onSelect={selectRegion}
        />
        <RegionDetail
          region={selected}
          filter={filter}
          news={liveNews}
          gdpReference={liveData.gdpReference}
        />
      </div>

      <CountryDirectory
        regions={visibleRegions}
        selectedId={selected?.id ?? ""}
        onSelect={selectRegion}
      />

      <section className="mt-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07101f]/90">
        <header className="border-b border-white/[0.07] p-5 sm:p-6">
          <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">
            GLOBAL MONEY FLOW
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            世界のお金の逃げ道
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            資金がリスクを避ける時に動きやすい代表的な経路です。
          </p>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {liveData.moneyFlows.map((flow) => {
            const style = levelStyle[flow.level];
            return (
              <article
                key={`${flow.from}-${flow.to}`}
                className={`rounded-2xl border ${style.border} bg-white/[0.025] p-5 transition hover:-translate-y-1`}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                    {flow.from}
                  </span>
                  <span className={`font-mono text-xl ${style.text}`}>→</span>
                  <span className="rounded-lg bg-white/[0.05] px-3 py-2 text-sm font-bold text-white">
                    {flow.to}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {flow.summary}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function LiveDataStatus({
  data,
  state,
}: {
  data: GlobalRiskData;
  state: "loading" | "live" | "partial" | "fallback";
}) {
  const status =
    state === "loading"
      ? { label: "市場データ接続中", color: "bg-cyan-300" }
      : state === "live"
        ? { label: "市場データ更新中", color: "bg-emerald-400" }
        : state === "partial"
          ? { label: "一部市場データ更新中", color: "bg-amber-400" }
          : { label: "公表値・保存値を表示", color: "bg-slate-400" };
  const updatedAt = data.marketDataUpdatedAt
    ? new Date(data.marketDataUpdatedAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-slate-400">
      <span className="inline-flex items-center gap-2 font-bold text-slate-200">
        <i className={`size-2 rounded-full ${status.color}`} />
        {status.label}
      </span>
      <span>
        代表市場 {data.liveMarketCount ?? 0}/{data.regions.length}件
      </span>
      {updatedAt && <span>取得 {updatedAt}</span>}
      <span>市場価格・ニュースは5分更新 / GDP・政策統計は公表時更新</span>
    </div>
  );
}

function CountryDirectory({
  regions,
  selectedId,
  onSelect,
}: {
  regions: GlobalRiskRegion[];
  selectedId: string;
  onSelect: (region: GlobalRiskRegion) => void;
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">
            COUNTRY DIRECTORY
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            国別リスク一覧
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          地図で選びにくい国はこちらから選択できます
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {regions.map((region) => {
          const style = levelStyle[region.level];
          const active = selectedId === region.id;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelect(region)}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${
                active
                  ? "border-cyan-300/40 bg-cyan-300/[0.08] shadow-[0_12px_32px_rgba(14,165,233,0.1)]"
                  : `${style.border} bg-[#07101f]/82`
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-cyan-300">
                    {region.code}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-white">
                    {region.japaneseName}
                  </h3>
                </div>
                <span className={`flex items-center gap-2 text-xs font-bold ${style.text}`}>
                  <i className={`size-2.5 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
              </div>
              {region.gdpRank && (
                <p className="mt-3 text-xs font-bold text-slate-400">
                  GDP {region.gdpRank}位 · ${region.gdpUsdTrillion?.toFixed(2)}兆
                </p>
              )}
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                {region.summary}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RegionDetail({
  region,
  filter,
  news,
  gdpReference,
}: {
  region: GlobalRiskRegion | null;
  filter: ViewFilter;
  news: MarketNewsItem[];
  gdpReference: GlobalRiskData["gdpReference"];
}) {
  if (!region) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-[#07101f]/90 p-6 text-sm text-slate-500">
        このフィルターに該当する国はありません。
      </section>
    );
  }

  const style = levelStyle[region.level];
  const risks =
    filter !== "all" &&
    !memberships.has(filter as GlobalRiskMembership)
      ? region.risks.filter((risk) => risk.category === filter)
      : region.risks;

  return (
    <aside className={`rounded-3xl border ${style.border} bg-[#07101f]/95 p-5 shadow-2xl shadow-black/20 sm:p-7`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.16em] text-cyan-300">
            {region.code} / {region.name.toUpperCase()}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {region.japaneseName}
          </h2>
        </div>
        <span className={`flex items-center gap-2 rounded-full border ${style.border} bg-black/20 px-3 py-2 text-xs font-bold ${style.text}`}>
          <i className={`size-2.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {region.gdpRank && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="2026 名目GDP順位" value={`${region.gdpRank}位`} />
          <Metric
            label="IMF推計"
            value={`$${region.gdpUsdTrillion?.toFixed(2)}兆`}
          />
        </div>
      )}

      <p className="mt-5 text-base leading-8 text-slate-300">{region.summary}</p>

      {region.marketPulse && (
        <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-cyan-300">
                LIVE MARKET PULSE
              </p>
              <strong className="mt-1 block text-sm text-white">
                {region.marketPulse.label}
              </strong>
            </div>
            <span
              className={`font-mono text-sm font-bold ${
                region.marketPulse.changePercent < 0
                  ? "text-rose-300"
                  : "text-emerald-300"
              }`}
            >
              {region.marketPulse.changePercent >= 0 ? "+" : ""}
              {region.marketPulse.changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric
              label="現在値"
              value={formatMarketValue(
                region.marketPulse.value,
                region.marketPulse.currency,
              )}
            />
            <Metric
              label="前日終値"
              value={formatMarketValue(
                region.marketPulse.previousClose,
                region.marketPulse.currency,
              )}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              観測{" "}
              {new Date(region.marketPulse.observedAt).toLocaleString("ja-JP")}
            </span>
            <a
              href={region.marketPulse.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-cyan-300 hover:text-cyan-200"
            >
              市場データ ↗
            </a>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {risks.map((risk) => {
          const riskStyle = levelStyle[risk.level];
          return (
            <div
              key={`${risk.category}-${risk.label}`}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-white">{risk.label}</strong>
                <span className={`flex items-center gap-2 text-xs font-bold ${riskStyle.text}`}>
                  <i className={`size-2 rounded-full ${riskStyle.dot}`} />
                  {riskStyle.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {risk.summary}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <p className="text-xs font-bold text-slate-400">関連指標</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {region.relatedIndicators.map((indicator) => (
            <span
              key={indicator}
              className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-1.5 text-xs font-bold text-cyan-100"
            >
              {indicator}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <p className="text-xs font-bold text-slate-400">一次資料</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {region.sourceUrls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
            >
              {index === 0 ? "IMF国別データ" : "関連機関"} ↗
            </a>
          ))}
          {region.gdpRank && (
            <a
              href={gdpReference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
            >
              GDP順位の出典 ↗
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <p className="text-xs font-bold text-slate-400">関連ニュース</p>
        <div className="mt-3 space-y-2">
          {news.slice(0, 2).map((item) => (
            <a
              key={item.id}
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl bg-white/[0.025] p-4 transition hover:bg-white/[0.045]"
            >
              <strong className="text-sm leading-6 text-slate-200">
                {item.title}
              </strong>
              <span className="mt-1 block text-xs text-slate-500">
                {item.sourceName}
              </span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}

function formatMarketValue(value: number, currency?: string) {
  return `${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)}${currency ? ` ${currency}` : ""}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-lg font-bold text-white">{value}</p>
    </div>
  );
}
