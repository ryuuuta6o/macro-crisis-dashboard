"use client";

import { useEffect, useMemo, useState } from "react";
import type { HiddenGemItem, HiddenGemsData } from "@/types/hidden-gems";
import type { SectorRegion } from "@/types/sector-momentum";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HiddenGemsData };

export function HiddenGemsPanel() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [themeFilter, setThemeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState<SectorRegion | "all">("all");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/sectors/hidden-gems", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Hidden Gemsデータを取得できませんでした。");
        return response.json() as Promise<HiddenGemsData>;
      })
      .then((data) => setLoadState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Hidden Gemsデータを取得できませんでした。",
          });
        }
      });
    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReloadToken((value) => value + 1);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (loadState.status === "loading") {
    return <HiddenGemsLoading />;
  }

  if (loadState.status === "error") {
    return (
      <section className="sector-panel hidden-gems-state">
        <p className="sector-eyebrow">HIDDEN GEMS</p>
        <h2>データ取得エラー</h2>
        <p>{loadState.message}</p>
        <button
          type="button"
          onClick={() => {
            setLoadState({ status: "loading" });
            setReloadToken((value) => value + 1);
          }}
        >
          再取得
        </button>
      </section>
    );
  }

  const { data } = loadState;
  return (
    <HiddenGemsResults
      data={data}
      themeFilter={themeFilter}
      setThemeFilter={setThemeFilter}
      regionFilter={regionFilter}
      setRegionFilter={setRegionFilter}
      onReload={() => {
        setLoadState({ status: "loading" });
        setReloadToken((value) => value + 1);
      }}
    />
  );
}

function HiddenGemsResults({
  data,
  themeFilter,
  setThemeFilter,
  regionFilter,
  setRegionFilter,
  onReload,
}: {
  data: HiddenGemsData;
  themeFilter: string;
  setThemeFilter: (value: string) => void;
  regionFilter: SectorRegion | "all";
  setRegionFilter: (value: SectorRegion | "all") => void;
  onReload: () => void;
}) {
  const themes = useMemo(() => {
    const map = new Map<string, string>();
    data.items.forEach((item) =>
      item.themes.forEach((theme) => map.set(theme.id, theme.nameJa)),
    );
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "ja"),
    );
  }, [data.items]);
  const regions = useMemo(() => {
    return Array.from(
      new Map(
        data.items.map((item) => [
          item.region,
          { id: item.region, label: regionLabel(item.region) },
        ]),
      ).values(),
    );
  }, [data.items]);
  const filteredItems = data.items.filter(
    (item) =>
      (themeFilter === "all" ||
        item.themes.some((theme) => theme.id === themeFilter)) &&
      (regionFilter === "all" || item.region === regionFilter),
  );
  const stale = isStale(data.generatedAt);

  return (
    <section className="sector-panel hidden-gems-panel">
      <div className="hidden-gems-head">
        <div>
          <p className="sector-eyebrow">FUNDAMENTALS VS ATTENTION</p>
          <h2>Hidden Gems / 原石スクリーナー</h2>
          <p>
            収益構造の強さと市場注目度の差を測ります。必須データが欠ける銘柄は判定から除外します。
          </p>
        </div>
        <div className="hidden-gems-summary">
          <Metric label="判定対象" value={`${data.evaluatedCompanies}`} />
          <Metric label="足切り通過" value={`${data.eligibleCompanies}`} />
          <Metric label="データ源" value={data.dataSource === "free" ? "Free batch" : "FMP"} />
          <Metric label="算出" value={formatDateTime(data.generatedAt)} />
        </div>
      </div>

      <div className="hidden-gems-method">
        <span>Gem Score</span>
        <strong>実態スコア - 注目スコア</strong>
        <small>最低条件: 売上CAGR 10%以上、営業黒字、時価総額$100M以上、3ヶ月+50%未満</small>
      </div>

      <div className="hidden-gems-controls">
        <label>
          Theme
          <select
            value={themeFilter}
            onChange={(event) => setThemeFilter(event.target.value)}
          >
            <option value="all">全テーマ</option>
            {themes.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Region
          <select
            value={regionFilter}
            onChange={(event) =>
              setRegionFilter(event.target.value as SectorRegion | "all")
            }
          >
            <option value="all">全地域</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>{region.label}</option>
            ))}
          </select>
        </label>
        <span className={`hidden-gems-data-status ${stale ? "is-stale" : `is-${data.status}`}`}>
          {stale
            ? "データ更新停滞"
            : data.status === "ready"
              ? "日次計算済み"
              : "データ未取得"}
        </span>
        <button type="button" className="sector-refresh-button" onClick={onReload}>
          再取得
        </button>
      </div>

      {stale && (
        <div className="hidden-gems-stale-warning">
          最終算出から3日以上経過しています。表示中のスコアは最新状態を反映していない可能性があります。
        </div>
      )}

      {data.status === "unavailable" || data.items.length === 0 ? (
        <div className="hidden-gems-empty">
          <strong>現在、判定可能な銘柄はありません</strong>
          <p>{data.dataNote}</p>
          <ExclusionSummary data={data} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="hidden-gems-empty">
          <strong>フィルター条件に一致する銘柄はありません</strong>
          <p>テーマまたは地域を切り替えてください。</p>
        </div>
      ) : (
        <div className="hidden-gems-table">
          <div className="hidden-gems-row hidden-gems-table-head" aria-hidden="true">
            <span>Company</span>
            <span>Theme</span>
            <span>Gem</span>
            <span>Fund.</span>
            <span>Attention</span>
            <span>Revenue CAGR</span>
            <span>PER</span>
            <span>Market Cap</span>
          </div>
          {filteredItems.map((item) => (
            <GemRow key={item.ticker} item={item} />
          ))}
        </div>
      )}

      <div className="hidden-gems-disclaimer">
        <p>{data.disclaimer}</p>
        <small>{data.dataNote}</small>
      </div>
    </section>
  );
}

function GemRow({ item }: { item: HiddenGemItem }) {
  return (
    <details className="hidden-gems-item">
      <summary className="hidden-gems-row">
        <span className="hidden-gems-company">
          <strong>{item.ticker} <em>{item.countryCode}</em></strong>
          <small>{item.companyName}</small>
          <small>{item.businessSummary}</small>
        </span>
        <span>{item.primaryThemeName}</span>
        <span className={item.gemScore >= 30 ? "is-strong" : ""}>{item.gemScore}</span>
        <span>{item.fundamentalScore}</span>
        <span>{item.attentionScore}</span>
        <span>{formatPercent(item.revenueCagr5y)}</span>
        <span>{formatMultiple(item.forwardPE)}</span>
        <span>{formatMarketCap(item.marketCapUsd)}</span>
      </summary>
      <div className="hidden-gems-breakdown">
        <div>
          <h3>判定理由</h3>
          <ul>
            {item.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
        <ScoreBreakdown title="実態スコア" items={item.components.fundamentals} />
        <ScoreBreakdown title="注目スコア" items={item.components.attention} />
        <div className="hidden-gems-meta">
          <span>3ヶ月 {formatPercent(item.return3m)}</span>
          <span>6ヶ月 {formatPercent(item.return6m)}</span>
          <span>営業利益率 {formatPercent(item.operatingMargin)}</span>
          <span>ROIC {formatPercent(item.roic)}</span>
          <span>Source {item.sourceName}</span>
        </div>
      </div>
    </details>
  );
}

function ScoreBreakdown({
  title,
  items,
}: {
  title: string;
  items: HiddenGemItem["components"]["fundamentals"];
}) {
  return (
    <div>
      <h3>{title}</h3>
      <dl>
        {items.map((item) => (
          <div key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.score === null ? "unavailable" : `${Math.round(item.score)}/100`}</dd>
            <small>{item.detail}</small>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExclusionSummary({ data }: { data: HiddenGemsData }) {
  return (
    <div className="hidden-gems-exclusions">
      <span>必須データ不足 {data.exclusions.missingRequiredData}</span>
      <span>成長率未達 {data.exclusions.lowRevenueGrowth}</span>
      <span>営業赤字 {data.exclusions.unprofitable}</span>
      <span>規模未達 {data.exclusions.tooSmall}</span>
      <span>短期急騰済み {data.exclusions.alreadySurged}</span>
    </div>
  );
}

function HiddenGemsLoading() {
  return (
    <section className="sector-panel hidden-gems-panel" aria-label="Hidden Gemsを計算中">
      <div className="hidden-gems-loading-head"><i /><i /></div>
      <div className="hidden-gems-loading-rows">
        {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <span><small>{label}</small><strong>{value}</strong></span>;
}

function formatPercent(value: number | null) {
  return value === null ? "unavailable" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatMultiple(value: number | null) {
  return value === null ? "unavailable" : `${value.toFixed(1)}x`;
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return `$${(value / 1_000_000).toFixed(0)}M`;
}

function regionLabel(region: SectorRegion) {
  const labels: Record<SectorRegion, string> = {
    us: "米国",
    japan: "日本",
    korea: "韓国",
    taiwan: "台湾",
    china: "中国本土",
    "hong-kong": "香港",
    europe: "欧州",
    india: "インド",
    other: "その他",
  };
  return labels[region];
}

function isStale(generatedAt: string) {
  const generated = new Date(generatedAt).getTime();
  if (!Number.isFinite(generated)) return true;
  return Date.now() - generated > 3 * 24 * 60 * 60 * 1000;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unavailable";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
