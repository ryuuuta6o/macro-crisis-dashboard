"use client";

import { useState } from "react";
import { SignalBadge } from "@/components/signal-badge";
import {
  formatIndicatorValue,
  signalLabel,
} from "@/lib/decision-support";
import { getIndicatorGlossary } from "@/lib/indicator-glossary";
import {
  getLiquidityCoreState,
  getLiquidityCoreSummaries,
  getRelatedNews,
  getWorseningLiquidityIndicators,
  type LiquidityCategorySummary,
} from "@/lib/liquidity-core";
import type {
  IndicatorId,
  IndicatorValue,
  MarketNewsItem,
  Signal,
} from "@/types/indicator";

const signalStyle: Record<
  Signal,
  { color: string; border: string; background: string; label: string }
> = {
  green: {
    color: "#34d399",
    border: "border-emerald-400/25",
    background: "from-emerald-500/[0.13]",
    label: "正常",
  },
  yellow: {
    color: "#fbbf24",
    border: "border-amber-400/30",
    background: "from-amber-500/[0.14]",
    label: "注意",
  },
  orange: {
    color: "#fb923c",
    border: "border-orange-400/35",
    background: "from-orange-500/[0.15]",
    label: "強い注意",
  },
  red: {
    color: "#fb7185",
    border: "border-rose-400/35",
    background: "from-rose-500/[0.16]",
    label: "強い詰まり",
  },
  unavailable: {
    color: "#94a3b8",
    border: "border-slate-500/25",
    background: "from-slate-500/[0.09]",
    label: "判定待ち",
  },
};

const whyItMatters: Partial<Record<IndicatorId, string>> = {
  "hy-oas":
    "信用力の低い企業がお金を借りにくくなると、倒産・雇用悪化・株式市場の不安へ波及しやすいためです。",
  "ig-oas":
    "優良企業まで資金調達コストが上がると、信用ストレスが市場全体へ広がっている可能性があるためです。",
  "baa-aaa":
    "信用力による借入条件の差が広がると、資金が弱い企業へ回りにくくなるためです。",
  "ccc-oas":
    "最も信用力の低い企業は資金市場の変化を早く受けるため、信用収縮の先行確認に役立ちます。",
  sofr: "担保付きの短期資金市場は金融システムの血流に近く、急な乱れは流動性不足へつながるためです。",
  "fra-ois":
    "銀行間の信用上乗せが急拡大すると、金融機関同士がお金を貸しにくくなっている可能性があるためです。",
  "ted-spread":
    "銀行信用と安全な短期国債の金利差は、短期市場の信用不安を表すためです。",
  "bank-deposit-outflow":
    "預金流出が続くと、銀行は貸出を減らしたり緊急資金へ依存したりする可能性があるためです。",
  "mmf-assets":
    "銀行預金からMMFへ急速に資金が移る動きは、安全資産への逃避を示す場合があるためです。",
  "discount-window":
    "銀行が中央銀行の緊急貸出へ急に依存すると、通常の資金調達が難しくなっている可能性があるためです。",
  btfp: "時限的な緊急制度の利用は、銀行システムに通常ではない資金需要があるかを示すためです。",
  "bank-cet1":
    "十分な自己資本は損失を吸収し、信用不安が銀行破綻へ発展するのを防ぐ最後の余力になるためです。",
  dgs10: "10年金利の急上昇は住宅・企業・政府の借入コストを広く押し上げるためです。",
  dgs30: "超長期金利は財政不安や長期資産の価格調整を映し、金融機関の保有資産にも影響するためです。",
  "treasury-auction":
    "米国債の買い手が弱くなると、世界の基準金利と担保市場の安定性に影響するためです。",
  move: "債券市場の予想変動が大きいと、価格形成やリスク管理が難しくなるためです。",
  sloos: "銀行が融資基準を厳しくすると、企業と家計へ新しいお金が届きにくくなるためです。",
  "leveraged-loan-default":
    "借入負担の大きい企業の返済不能が増えると、新規融資や借り換えが難しくなるためです。",
};

const dangerScenario: Partial<Record<IndicatorId, string>> = {
  "hy-oas": "400bpを超えて拡大が続き、IG OASやBAA-AAAも同時に悪化すると、信用市場全体への延焼に注意が必要です。",
  "ig-oas": "投資適格社債まで急拡大し、社債発行が難しくなると企業の借り換えリスクが高まります。",
  "baa-aaa": "2%を超えて広がると、信用力の低い企業へ資金が届きにくい状態が強まります。",
  sofr: "政策金利レンジから大きく上振れし、その状態が複数日続くと短期流動性の詰まりが疑われます。",
  "fra-ois": "50bp以上へ急騰すると、銀行間の資金調達不安が強い状態です。",
  "ted-spread": "0.60%以上へ拡大すると、短期市場の銀行信用不安が強まった状態です。",
  "bank-deposit-outflow": "大規模な預金流出が複数週続き、Discount Window利用も増える組み合わせに注意が必要です。",
  "mmf-assets": "銀行預金流出と同時に短期間で急増すると、資金逃避の可能性があります。",
  "discount-window": "週次残高が急増し、預金流出や信用スプレッド拡大を伴うと銀行不安の可能性が高まります。",
  btfp: "制度終了後に残高が再び増える、または新しい緊急制度が必要になる場合は政策ストレスの確認が必要です。",
  "bank-cet1": "8%未満への低下や急低下が起きると、損失吸収力への不安が強まります。",
  dgs10: "急上昇が続き、信用スプレッドやMOVEも同時に悪化すると市場全体へ波及しやすくなります。",
  dgs30: "5%超が続き、入札需要も弱い場合は財政・国債市場ストレスが強まります。",
  "treasury-auction": "応札倍率が2.10倍を下回り、テール拡大やディーラー負担増加が重なる状態に注意が必要です。",
  move: "130を超え、国債入札やレポ市場も悪化すると債券市場の機能低下が疑われます。",
  sloos: "引き締め超過が40%を超えると、信用収縮が雇用や設備投資へ波及しやすくなります。",
  "leveraged-loan-default": "4%を超え、CLOやプライベートクレジットにも損失が広がる状態に注意が必要です。",
};

type DetailSelection =
  | { kind: "category"; category: LiquidityCategorySummary }
  | { kind: "indicator"; indicator: IndicatorValue }
  | null;

export function LiquidityCore({
  indicators,
  news,
}: {
  indicators: IndicatorValue[];
  news: MarketNewsItem[];
}) {
  const summaries = getLiquidityCoreSummaries(indicators);
  const state = getLiquidityCoreState(summaries);
  const worsening = getWorseningLiquidityIndicators(summaries);
  const [selection, setSelection] = useState<DetailSelection>(null);
  const stateStyle = signalStyle[state.signal];

  return (
    <>
      <section
        id="liquidity-core"
        className={`mt-5 scroll-mt-20 overflow-hidden rounded-3xl border ${stateStyle.border} bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(145deg,rgba(10,25,48,0.98),rgba(3,10,24,0.98))] shadow-2xl shadow-black/20`}
      >
        <header className="border-b border-white/[0.07] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">
                LIQUIDITY CORE
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                お金の流動性コア
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                金融危機は「お金の流れ」が詰まった時に起きます。
              </p>
            </div>
            <div
              className={`rounded-2xl border ${stateStyle.border} bg-gradient-to-br ${stateStyle.background} to-transparent px-5 py-4`}
            >
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-500">
                現在のお金の流れ
              </p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-white">
                <span
                  className="size-3 rounded-full shadow-[0_0_14px_currentColor]"
                  style={{ backgroundColor: stateStyle.color, color: stateStyle.color }}
                />
                {state.status}
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-4xl rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] px-4 py-3 text-sm leading-7 text-cyan-50/80">
            {state.comment}
          </p>
        </header>

        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-5">
          {summaries.map((summary) => {
            const style = signalStyle[summary.signal];
            return (
              <button
                key={summary.id}
                type="button"
                onClick={() => setSelection({ kind: "category", category: summary })}
                className={`group min-h-48 rounded-2xl border ${style.border} bg-gradient-to-br ${style.background} to-[#07101f] p-4 text-left transition duration-200 hover:-translate-y-px focus:outline-none focus:ring-1 focus:ring-white/20`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.15em] text-slate-500">
                      {summary.english}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-white">
                      {summary.japanese}
                    </h3>
                  </div>
                  <span
                    className="size-3 rounded-full shadow-[0_0_14px_currentColor]"
                    style={{ backgroundColor: style.color, color: style.color }}
                  />
                </div>
                <p className="mt-4 text-sm font-bold" style={{ color: style.color }}>
                  {summary.status}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-300">
                  {summary.comment}
                </p>
                <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-3 text-[10px]">
                  <span className="text-slate-600">
                    {summary.indicators.length}指標
                    {summary.unavailableCount > 0
                      ? ` / ${summary.unavailableCount}未取得`
                      : ""}
                  </span>
                  <span className="font-bold text-cyan-300">詳しく見る</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/[0.07] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-300">
                DETERIORATING ITEMS
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                注意・悪化している項目
              </h3>
            </div>
            <p className="text-[10px] text-slate-600">
              黄・赤または前回から信号が悪化した指標
            </p>
          </div>

          {worsening.length > 0 ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {worsening.map((indicator, index) => (
                <button
                  key={indicator.id}
                  type="button"
                  onClick={() =>
                    setSelection({ kind: "indicator", indicator })
                  }
                  className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition hover:border-amber-300/25 hover:bg-amber-300/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] font-mono text-xs text-slate-500">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-white">
                      {indicator.name}
                    </strong>
                    <small className="mt-1 block text-[10px] text-slate-500">
                      {formatIndicatorValue(indicator, indicator.value)}
                    </small>
                  </span>
                  <SignalBadge signal={indicator.signal} />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.035] px-4 py-4 text-sm text-emerald-100/75">
              現在、大きく悪化している流動性指標はありません。
            </p>
          )}
        </div>
      </section>

      {selection && (
        <LiquidityDetailModal
          selection={selection}
          summaries={summaries}
          news={news}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  );
}

function LiquidityDetailModal({
  selection,
  summaries,
  news,
  onClose,
}: {
  selection: Exclude<DetailSelection, null>;
  summaries: LiquidityCategorySummary[];
  news: MarketNewsItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#020617]/80 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={
          selection.kind === "indicator"
            ? `${selection.indicator.name}の詳細`
            : `${selection.category.japanese}の詳細`
        }
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-cyan-300/15 bg-[#07101f] shadow-2xl shadow-black/50 sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[#07101f]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[9px] font-bold tracking-[0.18em] text-cyan-300">
              LIQUIDITY CORE DETAIL
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {selection.kind === "indicator"
                ? selection.indicator.name
                : selection.category.japanese}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            閉じる
          </button>
        </div>

        {selection.kind === "indicator" ? (
          <IndicatorDetail
            indicator={selection.indicator}
            summaries={summaries}
            news={news}
          />
        ) : (
          <CategoryDetail category={selection.category} />
        )}
      </section>
    </div>
  );
}

function CategoryDetail({
  category,
}: {
  category: LiquidityCategorySummary;
}) {
  const style = signalStyle[category.signal];
  return (
    <div className="p-5 sm:p-7">
      <div className={`rounded-2xl border ${style.border} bg-gradient-to-br ${style.background} to-transparent p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs leading-6 text-slate-300">
              {category.description}
            </p>
            <p className="mt-3 text-sm leading-7 text-white">
              {category.comment}
            </p>
          </div>
          <SignalBadge signal={category.signal} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {category.indicators.map((indicator) => (
          <a
            key={indicator.id}
            href={`#indicator-${indicator.id}`}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-cyan-300/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{indicator.name}</h3>
                <p className="mt-2 font-mono text-xl text-slate-200">
                  {formatIndicatorValue(indicator, indicator.value)}
                </p>
              </div>
              <SignalBadge signal={indicator.signal} />
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              {getIndicatorGlossary(indicator.id).shortDefinition}
            </p>
          </a>
        ))}
      </div>

      {(category.unavailableLabels?.length ?? 0) > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-400/10 bg-slate-400/[0.035] p-4">
          <p className="text-xs font-bold text-slate-300">未取得データ</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {category.unavailableLabels?.join(" / ")}
          </p>
          <p className="mt-2 text-[10px] leading-5 text-slate-600">
            未取得指標は正常扱いせず、カテゴリ判定の母数から除外しています。
          </p>
        </div>
      )}
    </div>
  );
}

function IndicatorDetail({
  indicator,
  summaries,
  news,
}: {
  indicator: IndicatorValue;
  summaries: LiquidityCategorySummary[];
  news: MarketNewsItem[];
}) {
  const glossary = getIndicatorGlossary(indicator.id);
  const related = summaries
    .find((summary) =>
      summary.indicators.some((item) => item.id === indicator.id),
    )
    ?.indicators.filter((item) => item.id !== indicator.id)
    .slice(0, 4);
  const relatedNews = getRelatedNews(indicator, news).slice(0, 3);
  const numericChange =
    indicator.numericValue !== null && indicator.previousNumericValue !== null
      ? indicator.numericValue - indicator.previousNumericValue
      : null;
  const direction =
    numericChange === null
      ? "比較データなし"
      : numericChange === 0
        ? "前回から横ばい"
        : numericChange > 0
          ? "前回より上昇"
          : "前回より低下";
  const sourceName = getSourceName(indicator);

  return (
    <div className="p-5 sm:p-7">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="現在値"
          value={formatIndicatorValue(indicator, indicator.value)}
        />
        <Metric
          label="前回値"
          value={formatIndicatorValue(indicator, indicator.previousValue)}
        />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-[10px] font-bold text-slate-600">変化と信号</p>
          <p className="mt-2 text-sm font-bold text-white">{direction}</p>
          <p className="mt-2 text-xs text-slate-400">
            判定：{signalLabel(indicator.signal)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <DetailBox title="初心者向け説明">
          {glossary.shortDefinition}
        </DetailBox>
        <DetailBox title="なぜ重要か">
          {whyItMatters[indicator.id] ?? indicator.description}
        </DetailBox>
        <DetailBox title="緑・黄・赤の基準">
          {indicator.id === "hy-oas"
            ? "緑：400bp未満 / 黄：400〜500bp / 橙：500〜600bp / 赤：600bp以上"
            : indicator.thresholdLabel}
        </DetailBox>
        <DetailBox title="何が起きると危ないか">
          {dangerScenario[indicator.id] ??
            "同じカテゴリの指標も同時に悪化し、その状態が継続する場合は資金の流れが細っている可能性があります。"}
        </DetailBox>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-xs font-bold text-white">関連指標</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(related ?? []).map((item) => (
            <a
              key={item.id}
              href={`#indicator-${item.id}`}
              className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-1.5 text-[10px] font-bold text-cyan-200"
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-xs font-bold text-white">関連ニュース</p>
        {relatedNews.length > 0 ? (
          <div className="mt-3 divide-y divide-white/[0.06]">
            {relatedNews.map((item) => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block py-3"
              >
                <strong className="text-sm text-slate-200">{item.title}</strong>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.reason}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            現在、この指標に直接ひもづくニュースはありません。
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="データソース" value={sourceName} />
        <Metric
          label="最終更新日"
          value={indicator.observationDate ?? "未更新"}
        />
      </div>
      {indicator.sourceUrl && (
        <a
          href={indicator.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-xs font-bold text-cyan-300 hover:text-cyan-200"
        >
          データソースを確認
        </a>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <p className="text-[10px] font-bold text-slate-600">{label}</p>
      <p className="mt-2 break-words font-mono text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function DetailBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <h3 className="text-xs font-bold text-cyan-200">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{children}</p>
    </section>
  );
}

function getSourceName(indicator: IndicatorValue) {
  if (indicator.sourceLabel) return indicator.sourceLabel;
  if (indicator.source === "FRED") {
    return `FRED ${indicator.fredSeries.join(" / ")}`;
  }
  return {
    treasury: "U.S. Treasury",
    "ny-fed": "Federal Reserve Bank of New York",
    "fiscal-data": "U.S. Treasury Fiscal Data",
    "market-data": "Market data",
    published: "Published report",
    manual: "Manual indicator data",
    unavailable: "取得不可",
  }[indicator.source];
}
