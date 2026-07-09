"use client";

import { useMemo, useState } from "react";
import { CompactGlobe } from "@/components/globe/CompactGlobe";
import {
  formatIndicatorValue,
  getChangeItems,
  getMarketSummary,
} from "@/lib/decision-support";
import { createSparkline, sparklinePoints } from "@/lib/mock-sparklines";
import { findSimilarPeriod } from "@/lib/decision-support";
import { assetTemperatures, similarPeriods } from "@/lib/content";
import type { GlobeHeroData } from "@/types/globe";
import type {
  IndicatorId,
  IndicatorValue,
  MarketNewsFeed,
  MarketNewsItem,
  OverallSignal,
  RiskLevel,
  Signal,
} from "@/types/indicator";

const keySignalIds: IndicatorId[] = [
  "hy-oas",
  "vix",
  "dgs10",
  "baa-aaa",
  "icsa",
  "ig-oas",
  "sofr",
  "office-cmbs",
  "private-credit-default",
  "margin-debt-m2",
];

const signalMeta: Record<Signal, { color: string; label: string }> = {
  green: { color: "#42d66f", label: "LOW" },
  yellow: { color: "#f0c419", label: "MODERATE" },
  orange: { color: "#ff8a2b", label: "ELEVATED" },
  red: { color: "#ff5548", label: "HIGH" },
  unavailable: { color: "#718096", label: "PENDING" },
};

export function ReferenceDashboard({
  indicators,
  news,
  newsFeed,
  overallSignal,
  riskLevel,
  riskComment,
  fetchedAt,
  globeData,
}: {
  indicators: IndicatorValue[];
  news: MarketNewsItem[];
  newsFeed: MarketNewsFeed;
  overallSignal: OverallSignal;
  riskLevel: RiskLevel;
  riskComment: string;
  fetchedAt: string;
  globeData: GlobeHeroData;
}) {
  const [selectedId, setSelectedId] = useState<IndicatorId>("vix");
  const cards = keySignalIds.flatMap((id) => {
    const indicator = indicators.find((item) => item.id === id);
    return indicator ? [indicator] : [];
  });

  return (
    <section className="reference-dashboard" aria-label="Macro Risk Signal Dashboard">
      <div className="reference-top-grid">
        <OverallRiskPanel level={riskLevel} comment={riskComment} />
        <DashboardGlobeHeader data={globeData} fetchedAt={fetchedAt} />
        <TodayChangePanel indicators={indicators} />
      </div>

      <div className="reference-workspace-grid">
        <div className="reference-metric-grid" aria-label="主要9指標">
          {cards.map((indicator) => (
            <MetricCard
              key={indicator.id}
              indicator={indicator}
              selected={selectedId === indicator.id}
              onSelect={() => setSelectedId(indicator.id)}
            />
          ))}
        </div>
        <ReferenceSideRail
          indicators={indicators}
          news={news}
          newsFeed={newsFeed}
          overallSignal={overallSignal}
        />
      </div>

      <div className="reference-bottom-grid">
        <HistoricalRegimePanel indicators={indicators} />
        <AssetTemperaturePanel />
        <RiskTrendPanel indicators={indicators} />
      </div>
    </section>
  );
}

function OverallRiskPanel({ level, comment }: { level: RiskLevel; comment: string }) {
  const meta = signalMeta[level];
  return (
    <section className="reference-panel reference-risk-panel" style={{ "--state-color": meta.color } as React.CSSProperties}>
      <PanelTitle title="Overall Risk Status" />
      <div className="reference-risk-body">
        <div>
          <div className="reference-risk-gauge"><i /></div>
          <strong className="reference-risk-word">{meta.label}</strong>
          <span>リスク監視フェーズ</span>
        </div>
        <div className="reference-risk-scale">
          {(["green", "yellow", "orange", "red"] as RiskLevel[]).map((item) => (
            <div key={item} className={item === level ? "is-current" : ""}>
              <i style={{ backgroundColor: signalMeta[item].color }} />
              <span>{signalMeta[item].label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="reference-risk-comment">{comment}</p>
      <div className="reference-risk-delta"><span>前日比</span><b>↑ リスク監視</b></div>
    </section>
  );
}

function DashboardGlobeHeader({ data, fetchedAt }: { data: GlobeHeroData; fetchedAt: string }) {
  return (
    <section className="reference-globe-header">
      <div className="reference-title-copy">
        <p>GLOBAL MACRO EARLY WARNING</p>
        <h1>Macro Risk Signal Dashboard</h1>
        <span>信用・流動性・金利・危機シグナルを一目で把握</span>
      </div>
      <CompactGlobe data={data} />
      <div className="reference-live-stamp"><i /> LIVE · {formatTime(fetchedAt)} JST</div>
    </section>
  );
}

function TodayChangePanel({ indicators }: { indicators: IndicatorValue[] }) {
  const changes = getChangeItems(indicators);
  const improving = changes.filter((item) => item.direction === "improving").length;
  const worsening = changes.filter((item) => item.direction === "worsening").length;
  const flat = changes.filter((item) => item.direction === "flat").length;
  const total = Math.max(1, improving + worsening + flat);
  const greenEnd = (improving / total) * 360;
  const yellowEnd = greenEnd + (flat / total) * 360;

  return (
    <section className="reference-panel reference-change-panel">
      <PanelTitle title="Today's Change" />
      <div className="reference-change-body">
        <div className="reference-change-list">
          <ChangeRow color="#42d66f" label="改善" value={improving} icon="↘" />
          <ChangeRow color="#f0c419" label="横ばい" value={flat} icon="→" />
          <ChangeRow color="#ff5548" label="悪化" value={worsening} icon="↗" />
          <ChangeRow color="#45b8ff" label="新規警戒" value={changes.filter((item) => item.currentSignal !== item.previousSignal).length} icon="+" />
          <ChangeRow color="#718096" label="取得待ち" value={indicators.filter((item) => item.signal === "unavailable").length} icon="·" />
        </div>
        <div className="reference-donut" style={{ background: `conic-gradient(#42d66f 0 ${greenEnd}deg,#f0a82b ${greenEnd}deg ${yellowEnd}deg,#ff5548 ${yellowEnd}deg 360deg)` }}>
          <div><strong>{total}</strong><span>Total</span></div>
        </div>
      </div>
    </section>
  );
}

function ChangeRow({ color, label, value, icon }: { color: string; label: string; value: number; icon: string }) {
  return <div><i style={{ backgroundColor: color }} /><span>{label}</span><b style={{ color }}>{icon} {value}</b></div>;
}

function MetricCard({ indicator, selected, onSelect }: { indicator: IndicatorValue; selected: boolean; onSelect: () => void }) {
  const meta = signalMeta[indicator.signal];
  const change = indicator.numericValue === null || indicator.previousNumericValue === null
    ? null
    : indicator.numericValue - indicator.previousNumericValue;
  const points = sparklinePoints(createSparkline(indicator.id, 28, change && change > 0 ? 0.08 : -0.02), 220, 64);

  return (
    <button
      type="button"
      className={`reference-metric-card ${selected ? "is-selected" : ""}`}
      style={{ "--state-color": meta.color } as React.CSSProperties}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="reference-metric-heading"><span>{indicator.name}</span><i>i</i></div>
      <div className="reference-metric-value">
        <strong>{formatIndicatorValue(indicator, indicator.value)}</strong>
        <span className={change === null ? "" : change > 0 ? "is-worse" : "is-better"}>
          {change === null ? "取得待ち" : `${change >= 0 ? "+" : ""}${change.toFixed(indicator.decimals)}${indicator.unit}`}
        </span>
      </div>
      <svg viewBox="0 0 220 64" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={`reference-fill-${indicator.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={meta.color} stopOpacity=".3"/><stop offset="1" stopColor={meta.color} stopOpacity="0"/></linearGradient></defs>
        <polyline points={`0,64 ${points} 220,64`} fill={`url(#reference-fill-${indicator.id})`} stroke="none" />
        <polyline points={points} fill="none" stroke={meta.color} strokeWidth="2" />
      </svg>
      <div className="reference-signal"><i /><span>{meta.label}</span></div>
      {selected && (
        <div className="reference-metric-details">
          <div><span>前回値</span><b>{formatIndicatorValue(indicator, indicator.previousValue)}</b></div>
          <div><span>判定基準</span><b>{indicator.thresholdLabel}</b></div>
          <div><span>更新日</span><b>{indicator.observationDate ?? "--"}</b></div>
          <p>{indicator.beginnerExplanation}</p>
          <span className="reference-detail-link">詳細を見る →</span>
        </div>
      )}
    </button>
  );
}

function ReferenceSideRail({ indicators, news, newsFeed, overallSignal }: { indicators: IndicatorValue[]; news: MarketNewsItem[]; newsFeed: MarketNewsFeed; overallSignal: OverallSignal }) {
  const summary = getMarketSummary(indicators, overallSignal).slice(0, 3);
  const liveCount = indicators.filter((indicator) => indicator.signal !== "unavailable").length;
  return (
    <aside className="reference-side-rail">
      <section className="reference-panel reference-ai-panel">
        <PanelTitle title="AI Market Summary / AI市場サマリー" badge="AI" />
        <div className="reference-ai-copy">
          {summary.map((line, index) => <p key={line}><b>0{index + 1}</b><span>{line}</span></p>)}
        </div>
        <div className="reference-data-coverage">
          <span><i /> LIVE DATA</span>
          <strong>{liveCount}/{indicators.length} 指標取得</strong>
        </div>
        <div className="reference-ai-orb" aria-hidden="true" />
      </section>
      <section className="reference-panel reference-news-panel">
        <PanelTitle title="Impact News Top 3 / 市場インパクトニュース" />
        <div className="reference-feed-state"><i />{feedLabel[newsFeed.mode]}</div>
        <div className="reference-news-list">
          {news.slice(0, 3).map((item, index) => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer">
              <b className={`is-${item.impactLevel}`}>{index + 1}</b>
              <span>
                <strong>{item.title}</strong>
                <em>{item.summary}</em>
                <small>{item.sourceName} · SCORE {item.impactScore}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}

function HistoricalRegimePanel({ indicators }: { indicators: IndicatorValue[] }) {
  const match = findSimilarPeriod(indicators, similarPeriods);
  const label = match?.period.label ?? "類似局面なし";
  return (
    <section id="historical-regime" className="reference-panel reference-bottom-panel scroll-mt-16">
      <PanelTitle title="Similar Historical Regime" />
      <div className="reference-history-body">
        <div className="reference-storm-art"><span>HISTORICAL</span></div>
        <div className="reference-history-copy">
          <strong>{label}</strong>
          <p>{match?.period.summary ?? "登録済み局面との一致度を監視中です。"}</p>
          {match && <small>一致した指標：{match.reasons.join(" / ")}</small>}
          <em>{match?.period.note ?? "類似局面は将来予測ではなく、現在地を理解するための参考情報です。"}</em>
        </div>
        <svg viewBox="0 0 190 80" preserveAspectRatio="none"><polyline points="0,61 18,45 35,54 55,25 73,47 92,20 112,39 132,29 152,50 171,42 190,46" fill="none" stroke="#4ba6ff" strokeWidth="2" /></svg>
      </div>
    </section>
  );
}

function AssetTemperaturePanel() {
  return (
    <section id="assets" className="reference-panel reference-bottom-panel scroll-mt-16">
      <PanelTitle title="Asset Temperature Map" />
      <div className="reference-temperature-legend"><span>Cold</span><i /><span>Hot</span></div>
      <div className="reference-temperature-grid">
        {assetTemperatures.map((asset) => (
          <div key={asset.label} className={`is-${asset.signal}`}>
            <strong>{asset.label}</strong>
            <span>{asset.comment}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskTrendPanel({ indicators }: { indicators: IndicatorValue[] }) {
  const paths = useMemo(() => [
    { id: "credit", color: "#ff5548", points: sparklinePoints(createSparkline("hy-oas", 30, 0.065), 440, 118) },
    { id: "liquidity", color: "#42d66f", points: sparklinePoints(createSparkline("sofr", 30, -0.01), 440, 118) },
    { id: "rates", color: "#f0a82b", points: sparklinePoints(createSparkline("dgs10", 30, 0.02), 440, 118) },
    { id: "vol", color: "#4ba6ff", points: sparklinePoints(createSparkline("vix", 30, 0.01), 440, 118) },
  ], []);
  const alertCount = indicators.filter((item) => item.signal === "red" || item.signal === "orange").length;
  const currentValues = [
    { id: "hy-oas" as IndicatorId, label: "信用 / HY OAS", color: "#ff5548" },
    { id: "sofr" as IndicatorId, label: "流動性 / SOFR", color: "#42d66f" },
    { id: "dgs10" as IndicatorId, label: "金利 / 米10年債", color: "#f0a82b" },
    { id: "vix" as IndicatorId, label: "ボラティリティ / VIX", color: "#4ba6ff" },
  ].flatMap((item) => {
    const indicator = indicators.find((candidate) => candidate.id === item.id);
    return indicator ? [{ ...item, value: formatIndicatorValue(indicator, indicator.value) }] : [];
  });
  return (
    <section className="reference-panel reference-bottom-panel">
      <PanelTitle title="Risk Trend (30D)" />
      <div className="reference-trend-legend"><span><i style={{ background: "#ff5548" }}/>信用</span><span><i style={{ background: "#42d66f" }}/>流動性</span><span><i style={{ background: "#f0a82b" }}/>金利</span><span><i style={{ background: "#4ba6ff" }}/>ボラ</span></div>
      <svg className="reference-trend-chart" viewBox="0 0 440 118" preserveAspectRatio="none">
        <line x1="0" x2="440" y1="59" y2="59" stroke="#24415f" strokeDasharray="3 5" />
        {paths.map((path) => <polyline key={path.id} points={path.points} fill="none" stroke={path.color} strokeWidth="2" />)}
      </svg>
      <div className="reference-trend-values">
        {currentValues.map((item) => (
          <div key={item.id}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong></div>
        ))}
      </div>
      <p>現在の橙・赤シグナル {alertCount}件。折れ線は30日間の方向比較を見やすくした補助表示です。</p>
    </section>
  );
}

function PanelTitle({ title, badge }: { title: string; badge?: string }) {
  return <div className="reference-panel-title">{badge && <b>{badge}</b>}<h2>{title}</h2><span>?</span></div>;
}

const feedLabel: Record<MarketNewsFeed["mode"], string> = {
  live: "LIVE FEED",
  mixed: "LIVE + OFFICIAL",
  official: "OFFICIAL FEED",
  fallback: "FEED DELAYED",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
