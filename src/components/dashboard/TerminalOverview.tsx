import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { OverallRiskStatus } from "@/components/dashboard/OverallRiskStatus";
import { DashboardAccordion } from "@/components/dashboard/DashboardAccordion";
import { PublicSectionFold } from "@/components/dashboard/PublicSectionFold";
import { getChangeItems, getMarketSummary, formatIndicatorValue } from "@/lib/decision-support";
import { createSparkline, sparklinePoints } from "@/lib/mock-sparklines";
import { getIndicatorGlossary } from "@/lib/indicator-glossary";
import { TYPE_LABELS } from "@/lib/indicators";
import type { ReactNode } from "react";
import type { GlobeHeroData } from "@/types/globe";
import type {
  ContagionLink,
  IndicatorId,
  IndicatorValue,
  MarketNewsFeed,
  MarketNewsItem,
  OverallSignal,
  RiskLevel,
  SafetyValve3DItem,
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
];

const signalMeta = {
  green: { color: "#4ade80", label: "LOW" },
  yellow: { color: "#facc15", label: "MODERATE" },
  orange: { color: "#fb923c", label: "ELEVATED" },
  red: { color: "#fb5b4d", label: "HIGH" },
  unavailable: { color: "#94a3b8", label: "PENDING" },
};

export function TerminalOverview({
  indicators,
  signal,
  level,
  fetchedAt,
  unavailableCount,
  globeData,
  news,
  newsFeed,
  comment,
  riskComposition,
  riskCompositionSignal,
  updateRadar,
  nextUpdateWatch,
  crisisRiskRange,
  liquidityCore,
  ignitionDistance,
  routeTracker,
  bubbleTrigger,
  bubbleTriggerSignal,
  riskVelocity,
}: {
  indicators: IndicatorValue[];
  signal: OverallSignal;
  level: RiskLevel;
  fetchedAt: string;
  unavailableCount: number;
  globeData: GlobeHeroData;
  news: MarketNewsItem[];
  newsFeed: MarketNewsFeed;
  items3d: SafetyValve3DItem[];
  links: ContagionLink[];
  comment: string;
  riskComposition: ReactNode;
  riskCompositionSignal: Signal;
  updateRadar: ReactNode;
  nextUpdateWatch: ReactNode;
  crisisRiskRange: ReactNode;
  liquidityCore: ReactNode;
  ignitionDistance: ReactNode;
  routeTracker: ReactNode;
  bubbleTrigger: ReactNode;
  bubbleTriggerSignal: Signal;
  riskVelocity: ReactNode;
}) {
  const ignitionSignal = highestSignal(
    indicators
      .filter((indicator) => indicator.type === "safety_valve")
      .map((indicator) => indicator.signal),
  );
  return (
    <section className="metrics-dashboard" aria-label="主要リスク監視パネル">
      <div className="metrics-heading">
        <DashboardHero indicators={indicators} signal={signal} level={level} fetchedAt={fetchedAt} globeData={globeData} />
      </div>
      <PublicSectionFold className="metrics-risk" id="overall-risk" eyebrow="OVERALL RISK STATUS" title="市場ストレス水準" description="いま金融全体が安全か危険か、ひとことで見る" signal={level} defaultOpen>
        <OverallRiskStatus level={level} signal={signal} comment={comment} unavailableCount={unavailableCount} />
      </PublicSectionFold>
      <PublicSectionFold className="metrics-composition" id="risk-composition-fold" eyebrow="RISK COMPOSITION" title="現在のリスク構成" description="現在の警戒圧力をカテゴリ別に分け、個別指標まで掘る" signal={riskCompositionSignal} defaultOpen>
        {riskComposition}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-update-radar" id="update-radar-fold" eyebrow="UPDATE RADAR" title="今日の更新レーダー" description="今日なにが変わったかを最初に見る" signal={ignitionSignal} defaultOpen>
        {updateRadar}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-next-update" id="next-update-watch-fold" eyebrow="NEXT UPDATE WATCH" title="次回更新予定" description="次に待つべき重要データを見る" signal={ignitionSignal} defaultOpen>
        {nextUpdateWatch}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-risk-range" id="crisis-risk-range-fold" eyebrow="CRISIS RISK RANGE" title="危機警戒レンジ" description="4種類の危機がどれくらい近いか、確率ではなく状態で見る" signal={level}>
        {crisisRiskRange}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-liquidity" id="liquidity-core-fold" eyebrow="LIQUIDITY CORE" title="お金の流動性コア" description="お金の流れが詰まっていないかを見る最重要セクション" signal={ignitionSignal}>
        {liquidityCore}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-ignition" id="ignition-distance-fold" eyebrow="IGNITION DISTANCE" title="点火までの距離" description="危機の警戒ラインまで、あとどれくらいかを見る" signal={ignitionSignal}>
        {ignitionDistance}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-routes" id="crisis-routes-fold" eyebrow="CRISIS ROUTES" title="危機ルート進行状況" description="どの壊れ方の道筋が進んでいるかを見る" signal={ignitionSignal}>
        {routeTracker}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-bubble-trigger" id="bubble-trigger-fold" eyebrow="BUBBLE TRIGGER" title="バブル崩壊・引き金タイプ判定" description="流動性主導か信用主導か、2つの崩れ方を分けて見る" signal={bubbleTriggerSignal}>
        {bubbleTrigger}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-velocity" id="risk-velocity-fold" eyebrow="RISK VELOCITY" title="悪化角度" description="悪化のスピードが速いかを見る" signal={ignitionSignal}>
        {riskVelocity}
      </PublicSectionFold>
      <PublicSectionFold className="metrics-grid-fold" eyebrow="KEY SIGNALS" title="主要9指標" signal={ignitionSignal}>
        <div className="metrics-grid">
            {keySignalIds.flatMap((id) => {
              const indicator = indicators.find((item) => item.id === id);
              return indicator ? [<ReadableMetricCard key={id} indicator={indicator} />] : [];
            })}
          </div>
      </PublicSectionFold>
      <PublicSectionFold className="metrics-rail-fold" eyebrow="TODAY / AI / NEWS" title="今日の変化・市場サマリー・ニュース" signal={ignitionSignal}>
        <CompactSideRail indicators={indicators} news={news} newsFeed={newsFeed} signal={signal} fetchedAt={fetchedAt} />
      </PublicSectionFold>
    </section>
  );
}

export function RiskTrendNewsAccordion({
  indicators,
  news,
  newsFeed,
  signal,
  fetchedAt,
  riskVelocity,
  riskTrend,
}: {
  indicators: IndicatorValue[];
  news: MarketNewsItem[];
  newsFeed: MarketNewsFeed;
  signal: OverallSignal;
  fetchedAt: string;
  riskVelocity: ReactNode;
  riskTrend: ReactNode;
}) {
  const newsSignal = highestSignal(news.slice(0, 3).map((item) => item.impactLevel));

  return (
    <DashboardAccordion
      id="risk-trend-news"
      eyebrow="06 / RISK TREND & NEWS"
      title="リスクトレンド / ニュース"
      description="悪化角度、時系列、市場インパクト"
      signal={newsSignal}
    >
      <div className="accordion-trend-stack">
        {riskVelocity}
        {riskTrend}
        <CompactSideRail indicators={indicators} news={news} newsFeed={newsFeed} signal={signal} fetchedAt={fetchedAt} />
      </div>
    </DashboardAccordion>
  );
}

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

function highestSignal(signals: Signal[]): Signal {
  return signals.reduce<Signal>(
    (highest, candidate) => signalRank[candidate] > signalRank[highest] ? candidate : highest,
    "unavailable",
  );
}

function ReadableMetricCard({ indicator }: { indicator: IndicatorValue }) {
  const meta = signalMeta[indicator.signal];
  const glossary = getIndicatorGlossary(indicator.id);
  const change =
    indicator.numericValue === null || indicator.previousNumericValue === null
      ? null
      : indicator.numericValue - indicator.previousNumericValue;
  const points = sparklinePoints(
    createSparkline(indicator.id, 24, change && change > 0 ? 0.09 : -0.025),
    220,
    58,
  );

  return (
    <a href={`#indicator-${indicator.id}`} className="readable-metric-card">
      <div className="readable-metric-head">
        <div>
          <p>{TYPE_LABELS[indicator.type].toUpperCase()}</p>
          <h2>{indicator.name}</h2>
          <small className="mt-1 block text-[10px] leading-4 text-slate-400">
            {glossary.plainName}
          </small>
        </div>
        <span className="readable-signal" style={{ color: meta.color }}>
          <i style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
      </div>

      <div className="readable-metric-value-row">
        <strong>{formatIndicatorValue(indicator, indicator.value)}</strong>
        <span
          style={{
            color:
              change === null ? "#94a3b8" : change > 0 ? "#fb7185" : "#4ade80",
          }}
        >
          {change === null
            ? "データ待機"
            : `${change >= 0 ? "+" : ""}${change.toFixed(indicator.decimals)}${indicator.unit}`}
        </span>
      </div>

      <svg viewBox="0 0 220 58" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`metric-fill-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`0,58 ${points} 220,58`}
          fill={`url(#metric-fill-${indicator.id})`}
          stroke="none"
        />
        <polyline points={points} fill="none" stroke={meta.color} strokeWidth="2.3" />
      </svg>

      <div className="readable-metric-footer">
        <span>{indicator.thresholdLabel}</span>
        <b>詳細を見る →</b>
      </div>
    </a>
  );
}

function CompactSideRail({
  indicators,
  news,
  newsFeed,
  signal,
  fetchedAt,
}: {
  indicators: IndicatorValue[];
  news: MarketNewsItem[];
  newsFeed: MarketNewsFeed;
  signal: OverallSignal;
  fetchedAt: string;
}) {
  const changes = getChangeItems(indicators).slice(0, 5);
  const summary = getMarketSummary(indicators, signal).slice(0, 3);

  return (
    <aside className="metrics-side-rail">
      <section className="terminal-panel">
        <SideHeading eyebrow="TODAY'S CHANGE" title="今日の変化" />
        <div className="metrics-change-list">
          {changes.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <b className={item.direction === "worsening" ? "text-red-300" : item.direction === "improving" ? "text-green-300" : "text-slate-300"}>
                {item.changeLabel}
              </b>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-panel compact-ai-panel">
        <SideHeading eyebrow="MARKET SUMMARY" title="市場サマリー" />
        <p className="metrics-live-note">指標取得時に自動生成 · {formatCompactTime(fetchedAt)}</p>
        <ol className="metrics-summary-list">
          {summary.map((line, index) => (
            <li key={line}><span>0{index + 1}</span><p>{line}</p></li>
          ))}
        </ol>
      </section>

      <section className="terminal-panel">
        <SideHeading eyebrow="IMPACT NEWS TOP 3" title="市場インパクト" />
        <div className="metrics-feed-status">
          <span className={`metrics-feed-status__dot metrics-feed-status__dot--${newsFeed.mode}`} />
          <strong>{feedModeLabel[newsFeed.mode]}</strong>
          <small>{newsFeed.sourceSummary}</small>
        </div>
        <div className="metrics-news-list">
          {news.slice(0, 3).map((item, index) => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer">
              <span className={`news-rank news-rank--${item.impactLevel}`}>{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.sourceName} · {formatCompactTime(item.publishedAt)} · SCORE {item.impactScore}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}

const feedModeLabel: Record<MarketNewsFeed["mode"], string> = {
  live: "ライブ取得中",
  mixed: "ライブ + 公的フィード",
  official: "公的フィード更新中",
  fallback: "ライブ取得停止中",
};

function formatCompactTime(value: string) {
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

function SideHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-title-row">
      <div><p className="panel-eyebrow">{eyebrow}</p><h2 className="panel-title">{title}</h2></div>
      <span className="panel-info">?</span>
    </div>
  );
}
