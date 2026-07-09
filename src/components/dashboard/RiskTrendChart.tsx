import { TiltCard } from "@/components/effects/TiltCard";
import type { IndicatorId, IndicatorValue, Signal } from "@/types/indicator";

const groups: Array<{
  name: string;
  description: string;
  color: string;
  ids: IndicatorId[];
}> = [
  {
    name: "信用市場",
    description: "HY・IG・CCC・BAA/AAA",
    color: "#22d3ee",
    ids: ["hy-oas", "ig-oas", "ccc-oas", "baa-aaa"],
  },
  {
    name: "金利・国債",
    description: "10年・30年・MOVE・入札",
    color: "#f59e0b",
    ids: ["dgs10", "dgs30", "move", "treasury-auction"],
  },
  {
    name: "短期流動性",
    description: "SOFR・銀行預金・MMF",
    color: "#8b5cf6",
    ids: ["sofr", "bank-deposit-outflow", "mmf-assets"],
  },
  {
    name: "株式ボラティリティ",
    description: "VIX",
    color: "#ef4444",
    ids: ["vix"],
  },
  {
    name: "商業不動産",
    description: "Office CMBS・CMBS全体",
    color: "#f97316",
    ids: ["office-cmbs", "cmbs-total"],
  },
  {
    name: "Private Credit",
    description: "Default・PIK・Leveraged Loan",
    color: "#ec4899",
    ids: [
      "private-credit-default",
      "pik-ratio",
      "leveraged-loan-default",
    ],
  },
  {
    name: "株式市場の脆弱性",
    description: "CAPE・Buffett・Margin Debt",
    color: "#fb7185",
    ids: ["shiller-cape", "buffett-indicator", "margin-debt-gdp", "margin-debt-m2"],
  },
];

const signalScore: Record<Signal, number | null> = {
  green: 20,
  yellow: 60,
  orange: 75,
  red: 90,
  unavailable: null,
};

export function RiskTrendChart({
  indicators,
}: {
  indicators: IndicatorValue[];
}) {
  const rows = groups.map((group) => {
    const selected = group.ids.flatMap((id) => {
      const indicator = indicators.find((item) => item.id === id);
      return indicator ? [indicator] : [];
    });
    const current = averageScore(selected.map((item) => item.signal));
    const previous = averageScore(selected.map((item) => item.previousSignal));
    return { ...group, current, previous };
  });

  return (
    <section id="historical" className="mt-6 scroll-mt-24">
      <TiltCard className="rounded-3xl border border-white/[0.08] bg-[#0b1426]/75 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-400">
              CURRENT RISK PROFILE
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              現在のリスク構成
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">
              各カテゴリの信号を0〜100へ換算しています。右へ長いほどリスクが高く、
              矢印は前回公表値からの方向を示します。
            </p>
          </div>
          <div className="flex gap-2 text-[9px] font-bold">
            <ScaleChip color="#22c55e" label="0–39 安定" />
            <ScaleChip color="#f59e0b" label="40–69 警戒" />
            <ScaleChip color="#ef4444" label="70–100 高リスク" />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {rows.map((row) => {
            const delta =
              row.current === null || row.previous === null
                ? null
                : row.current - row.previous;
            return (
              <div
                key={row.name}
                className="grid gap-3 rounded-xl border border-white/[0.06] bg-[#030916]/65 p-4 md:grid-cols-[180px_1fr_96px] md:items-center"
              >
                <div>
                  <p className="text-sm font-bold text-white">{row.name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {row.description}
                  </p>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="absolute inset-y-0 left-[40%] w-px bg-amber-300/35" />
                  <div className="absolute inset-y-0 left-[70%] w-px bg-red-300/35" />
                  {row.current !== null && (
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${row.current}%`,
                        background: `linear-gradient(90deg, ${row.color}88, ${row.color})`,
                        boxShadow: `0 0 16px ${row.color}55`,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2 md:justify-end">
                  <strong className="font-mono text-xl text-white">
                    {row.current ?? "--"}
                  </strong>
                  <span className={directionClass(delta)}>
                    {directionLabel(delta)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[10px] leading-5 text-slate-500">
          スコアは投資リターン予測ではありません。各指標の緑=20、黄=60、橙=75、赤=90をカテゴリ内で平均した、状態把握用の共通尺度です。
        </p>
      </TiltCard>
    </section>
  );
}

function averageScore(signals: Signal[]) {
  const scores = signals.flatMap((signal) => {
    const score = signalScore[signal];
    return score === null ? [] : [score];
  });
  return scores.length === 0
    ? null
    : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function directionLabel(delta: number | null) {
  if (delta === null) return "比較なし";
  if (delta > 0) return `↑ +${delta}`;
  if (delta < 0) return `↓ ${delta}`;
  return "→ 変化なし";
}

function directionClass(delta: number | null) {
  if (delta === null || delta === 0) return "text-[10px] text-slate-500";
  return delta > 0
    ? "text-[10px] font-bold text-red-300"
    : "text-[10px] font-bold text-green-300";
}

function ScaleChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="rounded-full border px-2.5 py-1"
      style={{ borderColor: `${color}44`, color }}
    >
      {label}
    </span>
  );
}
