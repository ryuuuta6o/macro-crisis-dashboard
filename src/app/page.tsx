import { AppShell } from "@/components/layout/AppShell";
import { TerminalOverview } from "@/components/dashboard/TerminalOverview";
import { PublicSectionFold } from "@/components/dashboard/PublicSectionFold";
import { ApocalypseCommandCenter } from "@/components/dashboard/ApocalypseCommandCenter";
import {
  BubbleTriggerMonitor,
  CombinationChecklist,
  CrisisRiskRange,
  CrisisRouteTracker,
  IgnitionDistancePanel,
  RiskVelocityPanel,
  ThreeLayerSummary,
} from "@/components/dashboard/EarlyWarningPanels";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { UpdateRadar } from "@/components/dashboard/UpdateRadar";
import { NextUpdateWatch } from "@/components/dashboard/NextUpdateWatch";
import { SmartMoneyDashboardSection } from "@/components/dashboard/SmartMoneyDashboardSection";
import { BehaviorDashboardSummary } from "@/components/dashboard/BehaviorDashboardSummary";
import { GlobalRiskDashboardSummary } from "@/components/dashboard/GlobalRiskDashboardSummary";
import { LiquidityCore } from "@/components/dashboard/LiquidityCore";
import { IndicatorCard } from "@/components/indicator-card";
import {
  ScenarioSection,
  SimilarPeriodSection,
} from "@/components/decision-sections";
import { getDashboardData } from "@/lib/fred";
import { getMarketImpactNewsFeed } from "@/lib/news";
import { getCrisisBehaviorData } from "@/lib/behavior";
import { buildEarlyWarningModel } from "@/lib/early-warning";
import { buildBubbleTriggerModel } from "@/lib/bubble-trigger";
import { buildUpdateRadarData } from "@/lib/update-radar";
import { buildNextUpdateWatchData } from "@/lib/next-update-watch";
import { getAutomatedConditions } from "@/lib/free-macro-data";
import { getContagionWatchData } from "@/lib/contagion-watch";
import { getGlobalRiskData } from "@/lib/global-risk";
import { buildGlobeHeroData } from "@/lib/globe-hero";
import {
  CATEGORY_LABELS,
  getOverallSignal,
  TYPE_SECTIONS,
} from "@/lib/indicators";
import { getThreePartRiskComment } from "@/lib/classification";
import {
  getContagionLinks,
  toRiskLevel,
  toSafetyValve3DItems,
} from "@/lib/three-risk";
import type {
  CoreIndicatorType,
  IndicatorCategory,
  IndicatorValue,
  Signal,
} from "@/types/indicator";

const categoryOrder: IndicatorCategory[] = [
  "credit",
  "rates",
  "liquidity",
  "bank-funding",
  "bank-capital",
  "household-credit",
  "credit-supply",
  "private-markets",
  "equity-vulnerability",
  "economy",
];

const typeOrder: CoreIndicatorType[] = [
  "vulnerability",
  "warning_signal",
  "safety_valve",
];

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const signalGroupSurface: Record<Signal, string> = {
  green: "border-emerald-400/25 bg-emerald-500/[0.055]",
  yellow: "border-yellow-400/25 bg-yellow-500/[0.06]",
  orange: "border-orange-400/30 bg-orange-500/[0.065]",
  red: "border-rose-400/30 bg-rose-500/[0.07]",
  unavailable: "border-slate-500/25 bg-slate-500/[0.05]",
};

const signalCategorySurface: Record<Signal, string> = {
  green: "border-emerald-400/70 bg-emerald-500/[0.05]",
  yellow: "border-yellow-400/70 bg-yellow-500/[0.055]",
  orange: "border-orange-400/75 bg-orange-500/[0.06]",
  red: "border-rose-400/75 bg-rose-500/[0.065]",
  unavailable: "border-slate-500/60 bg-slate-500/[0.04]",
};

function strongestSignal(indicators: IndicatorValue[]): Signal {
  return indicators.reduce<Signal>(
    (strongest, indicator) =>
      signalRank[indicator.signal] > signalRank[strongest]
        ? indicator.signal
        : strongest,
    "unavailable",
  );
}

export default async function Home() {
  const [data, newsFeed, automatedConditions, contagionWatch] = await Promise.all([
    getDashboardData(),
    getMarketImpactNewsFeed(),
    getAutomatedConditions(),
    getContagionWatchData(),
  ]);
  const news = newsFeed.items;
  const overallSignal = getOverallSignal(data.indicators);
  const riskLevel = toRiskLevel(overallSignal);
  const globeData = buildGlobeHeroData(
    data.indicators,
    getGlobalRiskData(),
    riskLevel,
    data.fetchedAt,
    contagionWatch.signal,
  );
  const items3d = toSafetyValve3DItems(data.indicators);
  const links = getContagionLinks(items3d);
  const riskComment = getThreePartRiskComment(data.indicators);
  const behavior = getCrisisBehaviorData();
  const earlyWarning = buildEarlyWarningModel(
    data.indicators,
    news,
    behavior.items,
    automatedConditions,
  );
  const bubbleTrigger = buildBubbleTriggerModel(data.indicators);
  const updateRadar = buildUpdateRadarData(data.indicators, news, data.fetchedAt);
  const nextUpdateWatch = buildNextUpdateWatchData(data.indicators);
  const vulnerabilityLayer = earlyWarning.layers.find((layer) => layer.id === "vulnerability");

  return (
    <AppShell>
      <main id="dashboard" className="relative mx-auto max-w-[1680px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 xl:pb-12">
        <TerminalOverview
          indicators={data.indicators}
          signal={overallSignal}
          level={riskLevel}
          fetchedAt={data.fetchedAt}
          unavailableCount={data.unavailableCount}
          globeData={globeData}
          news={news}
          newsFeed={newsFeed}
          items3d={items3d}
          links={links}
          comment={riskComment}
          updateRadar={<UpdateRadar data={updateRadar} />}
          nextUpdateWatch={<NextUpdateWatch data={nextUpdateWatch} />}
          crisisRiskRange={<CrisisRiskRange model={earlyWarning} />}
          liquidityCore={<LiquidityCore indicators={data.indicators} news={news} />}
          ignitionDistance={<IgnitionDistancePanel model={earlyWarning} />}
          routeTracker={<CrisisRouteTracker model={earlyWarning} />}
          bubbleTrigger={<BubbleTriggerMonitor model={bubbleTrigger} />}
          bubbleTriggerSignal={bubbleTrigger.conversionRisk.signal}
          riskVelocity={<RiskVelocityPanel model={earlyWarning} />}
        />

        <PublicSectionFold
          id="classification-summary-fold"
          eyebrow="THREE-LAYER SUMMARY"
          title="脆弱性・触発・点火"
          description="爆薬、火花、導火線を混ぜずに分けて見る"
          signal={vulnerabilityLayer?.signal ?? "unavailable"}
          status={vulnerabilityLayer?.status}
        >
          <ThreeLayerSummary model={earlyWarning} contagion={contagionWatch} />
        </PublicSectionFold>

        <PublicSectionFold
          id="combination-checklist-fold"
          eyebrow="COMBINATION CHECKLIST"
          title="危機条件の成立チェック"
          description="危機タイプごとに、どの条件が揃ったかを見る"
          signal={riskLevel}
        >
          <CombinationChecklist model={earlyWarning} />
        </PublicSectionFold>

        <PublicSectionFold
          id="supporting-signals-fold"
          eyebrow="SUPPORTING SIGNALS"
          title="危機前行動・著名投資家・世界リスク"
          description="人・企業・資金・地域がどこへ動いているかを見る"
          signal={riskLevel}
        >
          <section aria-label="補助シグナルと世界リスク" className="mt-5 grid gap-4 xl:grid-cols-3">
            <BehaviorDashboardSummary />
            <SmartMoneyDashboardSection />
            <GlobalRiskDashboardSummary />
          </section>
        </PublicSectionFold>

        <PublicSectionFold
          id="apocalypse-fold"
          eyebrow="APOCALYPSE COMMAND CENTER"
          title="異常検知・危機ニュース密度・資金逃避"
          description="今日の異常、ニュース密度、逃避資金をまとめて確認"
          signal={riskLevel}
        >
          <ApocalypseCommandCenter indicators={data.indicators} news={news} />
        </PublicSectionFold>

        <PublicSectionFold
          id="signals-fold"
          eyebrow="SIGNAL MATRIX"
          title="金融危機シグナル・マトリクス"
          description="全指標の現在値、閾値、データソースを一覧で確認"
          signal={riskLevel}
        >
          <IndicatorMatrix indicators={data.indicators} />
        </PublicSectionFold>

        <PublicSectionFold
          id="historical-regime-fold"
          eyebrow="HISTORICAL REGIME"
          title="過去の類似局面・今後30日のシナリオ"
          description="現在に似た局面と、条件付きシナリオを見る"
          signal={riskLevel}
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <SimilarPeriodSection indicators={data.indicators} />
            <ScenarioSection indicators={data.indicators} />
          </div>
        </PublicSectionFold>

        <PublicSectionFold
          id="risk-profile-fold"
          eyebrow="CURRENT RISK PROFILE"
          title="現在のリスク構成"
          description="信用、金利、流動性、ボラティリティの強弱を見る"
          signal={riskLevel}
        >
          <RiskTrendChart indicators={data.indicators} />
        </PublicSectionFold>

        <footer id="settings" className="mt-10 border-t border-white/[0.07] py-8 text-center text-xs leading-6 text-slate-600">
          <p>本サイトは投資助言ではなく、市場環境の情報提供・解説です。表示内容は売買判断を推奨するものではありません。</p>
          <p className="mt-2">Data source: Federal Reserve Bank of St. Louis / GDELT / SEC / Manual sources</p>
        </footer>
      </main>
    </AppShell>
  );
}

function IndicatorMatrix({ indicators }: { indicators: IndicatorValue[] }) {
  return (
    <section id="signals" className="mt-10 scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-400">THREE-LAYER RISK MATRIX</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">金融危機シグナル・マトリクス</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-400">全指標を脆弱性・警告サイン・安全弁に分けて表示します。カードを押すと閾値、データソース、更新日時を確認できます。</p>
      </div>

      <div className="space-y-14">
        {typeOrder.map((type) => {
          const typeInfo = TYPE_SECTIONS[type];
          const typedIndicators = indicators.filter((indicator) => indicator.type === type);
          const typeSignal = strongestSignal(typedIndicators);
          return (
            <section key={type} aria-labelledby={`type-${type}`}>
              <div className={`mb-7 rounded-2xl border p-5 ${signalGroupSurface[typeSignal]}`}>
                <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-400">{typeInfo.english}</p>
                <h3 id={`type-${type}`} className="mt-1 text-xl font-bold text-white">{typeInfo.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{typeInfo.description}</p>
              </div>

              <div className="space-y-9">
                {categoryOrder.flatMap((category) => {
                  const selected = typedIndicators.filter((indicator) => indicator.category === category);
                  if (!selected.length) return [];
                  const info = CATEGORY_LABELS[category];
                  const categorySignal = strongestSignal(selected);
                  return [
                    <section key={`${type}-${category}`}>
                      <div className={`mb-4 rounded-r-xl border-l-[3px] px-4 py-3 ${signalCategorySurface[categorySignal]}`}>
                        <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">{info.eyebrow}</p>
                        <h4 className="text-lg font-bold text-white">{info.title}</h4>
                        <p className="mt-1 text-sm text-slate-400">{info.description}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {selected.map((indicator) => (
                          <IndicatorCard
                            key={indicator.id}
                            indicator={indicator}
                            allIndicators={indicators}
                            index={indicators.findIndex((item) => item.id === indicator.id)}
                          />
                        ))}
                      </div>
                    </section>,
                  ];
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
