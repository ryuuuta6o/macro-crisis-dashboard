import { SignalBadge } from "@/components/signal-badge";
import { TiltCard } from "@/components/effects/TiltCard";
import {
  assetTemperatures,
  similarPeriods,
} from "@/lib/content";
import {
  findSimilarPeriod,
  getChangeComment,
  getChangeItems,
  getMarketSummary,
  getScenarios,
} from "@/lib/decision-support";
import type {
  IndicatorValue,
  MarketNewsItem,
  OverallSignal,
  Signal,
} from "@/types/indicator";

const directionStyle = {
  worsening: "text-red-300",
  improving: "text-green-300",
  flat: "text-slate-400",
};

const directionIcon = {
  worsening: "↗",
  improving: "↘",
  flat: "→",
};

export function ChangeLog({
  indicators,
  overallSignal,
}: {
  indicators: IndicatorValue[];
  overallSignal: OverallSignal;
}) {
  const changes = getChangeItems(indicators);

  return (
    <section id="changes" className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/80 p-5 backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-blue-400">
            DAILY CHANGE LOG
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">今日の変化</h2>
        </div>
        <span className="text-2xl text-blue-300">↗</span>
      </div>

      {changes.length > 0 ? (
        <div className="mt-5 divide-y divide-white/[0.06]">
          {changes.map((change) => (
            <div
              key={change.id}
              className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-semibold text-white">{change.name}</p>
                <p className="mt-1 font-mono text-sm text-slate-400">
                  {change.previousLabel}
                  <span className="mx-2 text-slate-600">→</span>
                  {change.currentLabel}
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${directionStyle[change.direction]}`}
              >
                {directionIcon[change.direction]} {change.changeLabel}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
          前回取得値から有意な変化は確認されていません。
        </p>
      )}

      <p className="mt-4 border-t border-white/[0.07] pt-4 text-sm leading-7 text-slate-300">
        {getChangeComment(indicators, overallSignal)}
      </p>
    </section>
  );
}

export function MarketSummary({
  indicators,
  overallSignal,
}: {
  indicators: IndicatorValue[];
  overallSignal: OverallSignal;
}) {
  const lines = getMarketSummary(indicators, overallSignal);

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.08] to-[#0b1426] p-5 backdrop-blur-xl sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.18em] text-blue-300">
        RULE-BASED MARKET SUMMARY
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">AI市場サマリー</h2>
      <ol className="mt-5 space-y-3">
        {lines.map((line, index) => (
          <li key={line} className="flex gap-3 text-sm leading-6 text-slate-200">
            <span className="font-mono text-blue-400">0{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[10px] text-slate-600">
        指標状態からルールベースで生成した現状解説です。
      </p>
    </section>
  );
}

export function NewsSection({ news }: { news: MarketNewsItem[] }) {
  return (
    <section id="news" className="mt-8">
      <SectionHeading
        eyebrow="MARKET IMPACT RANKING"
        title="危機シグナルへの影響度ランキングTOP3"
        description="GDELT取得記事を3分類指標との関連度・重大度・鮮度で自動選別"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {news.slice(0, 3).map((item, index) => (
          <TiltCard
            key={item.id}
            className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/80 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-blue-500/10 font-mono text-xs font-bold text-blue-300">
                  {index + 1}
                </span>
                <SignalBadge signal={item.impactLevel} />
              </div>
              <span className="text-[10px] text-slate-500">
                {new Intl.DateTimeFormat("ja-JP", {
                  timeZone: "Asia/Tokyo",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(item.publishedAt))}
              </span>
            </div>
            <p className="mt-4 text-[10px] font-bold tracking-[0.14em] text-blue-400">
              {item.impactCategory} · SCORE {item.impactScore}
            </p>
            <h3 className="mt-2 font-bold leading-6 text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {item.summary}
            </p>
            <div className="mt-4 rounded-xl bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500">
                関連指標
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {item.relatedIndicators.join(" / ")}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                理由：{item.reason}
              </p>
            </div>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-xs font-semibold text-blue-300 hover:text-blue-200"
            >
              {item.sourceName}で確認 ↗
            </a>
          </TiltCard>
        ))}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-slate-600">
        影響度は価格予測ではなく、現在の安全弁・警告サイン・脆弱性との関連度です。ニュースは売買判断ではなく、市場環境の確認材料として表示しています。
      </p>
    </section>
  );
}

export function AssetTemperatures() {
  return (
    <section id="assets" className="mt-8">
      <SectionHeading
        eyebrow="ASSET TEMPERATURE"
        title="資産別温度感"
        description="手動更新による市場横断の補助ビュー"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {assetTemperatures.map((asset) => (
          <TiltCard
            key={asset.label}
            className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl ${
              asset.signal === "red"
                ? "border-red-500/20 bg-red-500/[0.07]"
                : asset.signal === "orange"
                  ? "border-orange-500/20 bg-orange-500/[0.06]"
                : asset.signal === "yellow"
                  ? "border-yellow-500/15 bg-yellow-500/[0.05]"
                  : "border-green-500/15 bg-green-500/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-white">{asset.label}</h3>
              <TemperatureDot signal={asset.signal} />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {asset.comment}
            </p>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

export function SimilarPeriodSection({
  indicators,
}: {
  indicators: IndicatorValue[];
}) {
  const match = findSimilarPeriod(indicators, similarPeriods);

  return (
    <section id="historical-regime" className="mt-8 rounded-3xl border border-white/[0.08] bg-[#0b1426]/80 p-5 backdrop-blur-xl sm:p-7">
      <p className="text-[10px] font-bold tracking-[0.18em] text-purple-300">
        HISTORICAL REFERENCE
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">過去の類似局面</h2>
      {match ? (
        <>
          <p className="mt-5 text-2xl font-bold text-white">
            {match.period.label}に類似
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            類似理由：{match.reasons.join("、")}の信号構成が近い状態です。
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            {match.period.summary}
          </p>
          <div className="mt-5 h-24 rounded-xl border border-white/[0.06] bg-[#030916]/70 p-3">
            <svg viewBox="0 0 600 80" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                points="0,62 55,59 110,63 165,48 220,51 275,31 330,38 385,22 440,28 500,15 560,19 600,9"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
              />
              <polyline
                points="0,70 55,66 110,60 165,58 220,45 275,49 330,39 385,43 440,30 500,34 560,23 600,26"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                opacity="0.65"
              />
            </svg>
          </div>
          <p className="mt-4 rounded-xl bg-purple-400/[0.06] px-4 py-3 text-xs leading-6 text-purple-200/70">
            {match.period.note}
          </p>
        </>
      ) : (
        <p className="mt-5 text-sm leading-7 text-slate-400">
          現在の取得済み指標では、登録された過去局面との十分な一致を確認できません。
        </p>
      )}
      <p className="mt-4 text-[10px] text-slate-600">
        未来予測ではなく、過去に似た局面の参考情報です。
      </p>
    </section>
  );
}

export function ScenarioSection({
  indicators,
}: {
  indicators: IndicatorValue[];
}) {
  return (
    <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0b1426]/80 p-5 backdrop-blur-xl sm:p-7">
      <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">
        CONDITIONAL SCENARIOS
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">今後30日のシナリオ</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {getScenarios(indicators).map((scenario, index) => (
          <article
            key={scenario.label}
            className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
          >
            <p
              className={`text-xs font-bold ${
                index === 0
                  ? "text-blue-300"
                  : index === 1
                    ? "text-red-300"
                    : "text-green-300"
              }`}
            >
              {scenario.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {scenario.text}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-slate-600">
        条件分岐の整理であり、価格変動を予測・断定するものではありません。
      </p>
    </section>
  );
}

function TemperatureDot({
  signal,
}: {
  signal: Exclude<Signal, "unavailable">;
}) {
  const colors = {
    green: "bg-green-500 shadow-green-500/40",
    yellow: "bg-yellow-500 shadow-yellow-500/40",
    orange: "bg-orange-500 shadow-orange-500/40",
    red: "bg-red-500 shadow-red-500/40",
  };
  return <span className={`size-2.5 rounded-full shadow-lg ${colors[signal]}`} />;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold tracking-[0.18em] text-blue-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
    </div>
  );
}
