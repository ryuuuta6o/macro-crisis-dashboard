import type { OverallSignal, RiskLevel } from "@/types/indicator";

const levelContent: Record<
  RiskLevel,
  { english: string; japanese: string; color: string }
> = {
  green: { english: "LOW", japanese: "安全", color: "#3FB950" },
  yellow: { english: "MODERATE", japanese: "注意", color: "#D29922" },
  orange: { english: "ELEVATED", japanese: "警戒", color: "#D97706" },
  red: { english: "HIGH", japanese: "危険", color: "#F85149" },
};

export function OverallRiskStatus({
  level,
  signal,
  comment,
  unavailableCount,
}: {
  level: RiskLevel;
  signal: OverallSignal;
  comment: string;
  unavailableCount: number;
}) {
  const content = levelContent[level];
  const isPending = signal === "unavailable";
  const dialDegrees: Record<RiskLevel, number> = {
    green: 72,
    yellow: 158,
    orange: 246,
    red: 360,
  };

  return (
    <section className={`terminal-panel risk-status-panel risk-status-panel--${level}`}>
      <div className="panel-title-row">
        <div>
          <p className="panel-eyebrow">OVERALL RISK STATUS</p>
          <h2 className="panel-title">市場ストレス水準</h2>
        </div>
        <span className="panel-info">?</span>
      </div>

      <div className="public-overall-risk-layout">
        <div className="risk-dial">
          <div
            className="risk-dial-track"
            style={{ background: `conic-gradient(${content.color} 0 ${dialDegrees[level]}deg, #1c2a3b ${dialDegrees[level]}deg 360deg)` }}
          >
            <div className="risk-dial-center"><span style={{ background: content.color, color: content.color }} /></div>
          </div>
        </div>

        <div className="public-overall-risk-scale">
          {(["green", "yellow", "orange", "red"] as RiskLevel[]).map((item) => (
            <div key={item} className={level === item ? "is-active" : ""}>
              <i style={{ backgroundColor: levelContent[item].color }} />
              <span>{levelContent[item].english}</span>
            </div>
          ))}
        </div>

        <div className="public-overall-risk-state">
          <strong style={{ color: content.color }}>{isPending ? "PENDING" : content.english}</strong>
          <span>{isPending ? "データ待機" : `${content.japanese}・リスク監視フェーズ`}</span>
        </div>
      </div>

      <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-5 text-slate-400">
        {comment}
      </p>
      <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-slate-600">
        <span>24H SIGNAL</span>
        <span className="text-slate-300">
          {unavailableCount === 0 ? "ALL SYSTEMS LIVE" : `${unavailableCount} PENDING`}
        </span>
      </div>
    </section>
  );
}
