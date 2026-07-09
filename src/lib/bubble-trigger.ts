import { BUBBLE_TRIGGER_CONFIG } from "@/config/manual-data";
import type { IndicatorValue, Signal } from "@/types/indicator";

type TriggerMetric = {
  name: string;
  value: string;
  signal: Signal;
  criteria: string;
  sourceName: string;
  sourceUrl?: string;
  observationDate: string | null;
  updateFrequency: string;
};

type TriggerType = {
  id: "dotcom" | "lehman";
  title: string;
  japanese: string;
  signal: Signal;
  status: string;
  summary: string;
  beginnerExplanation: string;
  metrics: TriggerMetric[];
};

export type BubbleTriggerModel = {
  dotcom: TriggerType;
  lehman: TriggerType;
  dominant: string;
  conversionRisk: {
    active: boolean;
    signal: Signal;
    label: string;
    summary: string;
  };
  boeThresholdNote: {
    label: string;
    sourceName: string;
    sourceUrl: string;
  };
};

const rank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

function worst(signals: Signal[]): Signal {
  return signals.reduce<Signal>(
    (current, candidate) => (rank[candidate] > rank[current] ? candidate : current),
    "unavailable",
  );
}

function indicatorMetric(item: IndicatorValue | undefined, criteria: string): TriggerMetric {
  if (!item || item.signal === "unavailable") {
    return {
      name: item?.name ?? "未取得指標",
      value: "取得不可",
      signal: "unavailable",
      criteria,
      sourceName: "取得不可",
      observationDate: null,
      updateFrequency: "次回再検証",
    };
  }
  return {
    name: item.name,
    value:
      item.numericValue === null
        ? String(item.value ?? "取得不可")
        : `${item.numericValue.toFixed(item.decimals)}${item.unit}`,
    signal: item.signal,
    criteria,
    sourceName: item.sourceLabel ?? item.sourceName ?? item.source,
    sourceUrl:
      item.sourceUrl ??
      (item.source === "FRED" && item.fredSeries.length
        ? `https://fred.stlouisfed.org/graph/?id=${item.fredSeries.join(",")}`
        : undefined),
    observationDate: item.observationDate,
    updateFrequency: item.updateFrequency ?? "公表時更新",
  };
}

function policySignal() {
  const stance = BUBBLE_TRIGGER_CONFIG.dotcom.fedPolicy.stance;
  if (stance === "hiking") return "red" as const;
  if (stance === "hike-watch") return "yellow" as const;
  return "green" as const;
}

function techConcentrationSignal(value: number) {
  const config = BUBBLE_TRIGGER_CONFIG.dotcom.techConcentration;
  if (value >= config.redPct) return "red" as const;
  if (value >= config.warningPct) return "yellow" as const;
  return "green" as const;
}

function momentumSignal() {
  const momentum = BUBBLE_TRIGGER_CONFIG.dotcom.momentum;
  if (!momentum.above200Day) return "red" as const;
  if (!momentum.above50Day) return "yellow" as const;
  return "green" as const;
}

function buildDotcomTrigger(indicators: IndicatorValue[]): TriggerType {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const dgs10 = byId.get("dgs10");
  const dgs30 = byId.get("dgs30");
  const ratesSignal = worst([dgs10?.signal ?? "unavailable", dgs30?.signal ?? "unavailable"]);
  const policy = BUBBLE_TRIGGER_CONFIG.dotcom.fedPolicy;
  const concentration = BUBBLE_TRIGGER_CONFIG.dotcom.techConcentration;
  const momentum = BUBBLE_TRIGGER_CONFIG.dotcom.momentum;
  const policyRisk = policySignal();
  const concentrationRisk = techConcentrationSignal(concentration.valuePct);
  const momentumRisk = momentumSignal();

  const signal: Signal =
    policyRisk === "red" && momentumRisk === "red"
      ? "red"
      : (policyRisk === "red" || ratesSignal === "red" || momentumRisk === "yellow")
        ? "yellow"
        : worst([policyRisk, concentrationRisk, ratesSignal, momentumRisk]) === "yellow"
          ? "yellow"
          : "green";

  return {
    id: "dotcom",
    title: "Dot-com Type",
    japanese: "ドットコム型（流動性・金利主導）",
    signal,
    status:
      signal === "red"
        ? "引き金作動の可能性"
        : signal === "yellow"
          ? "流動性引き締め注意"
          : "流動性供給・勢い維持",
    summary:
      signal === "red"
        ? "FRBの引き締め方向とモメンタム悪化が重なり、テーマ集中バブルの巻き戻しに注意が必要です。"
        : signal === "yellow"
          ? "テック集中度や金利の高止まりにより、信用無風でも流動性主導の調整リスクを監視します。"
          : "信用市場とは別に、金利と市場モメンタムの崩れを監視しています。",
    beginnerExplanation:
      "株が崩れる原因が、お金の貸し借りの詰まりではなく、金利上昇や流動性の引き上げでテーマ株から資金が抜ける型です。",
    metrics: [
      {
        name: "FRB金融政策スタンス",
        value: policy.label,
        signal: policyRisk,
        criteria: "利下げ・維持=緑 / 利上げ観測=黄 / 明確な利上げ転換=赤",
        sourceName: policy.sourceName,
        sourceUrl: policy.sourceUrl,
        observationDate: policy.observationDate,
        updateFrequency: policy.updateFrequency,
      },
      indicatorMetric(dgs10, "4.5%未満=緑 / 4.5〜5.0%=黄 / 5.0%以上=赤"),
      indicatorMetric(dgs30, "4.7%未満=緑 / 4.7〜5.0%=黄 / 5.0%以上=赤"),
      {
        name: "S&P500テック集中度",
        value: `${concentration.valuePct.toFixed(1)}%`,
        signal: concentrationRisk,
        criteria: `${concentration.warningPct}%以上=黄 / ${concentration.redPct}%以上=赤`,
        sourceName: concentration.sourceName,
        sourceUrl: concentration.sourceUrl,
        observationDate: concentration.observationDate,
        updateFrequency: concentration.updateFrequency,
      },
      {
        name: "モメンタム転換",
        value: `${momentum.above50Day ? "50日線上" : "50日線割れ"} / ${momentum.above200Day ? "200日線上" : "200日線割れ"}`,
        signal: momentumRisk,
        criteria: "50日線上=緑 / 50日線割れ=黄 / 200日線割れ=赤",
        sourceName: momentum.sourceName,
        sourceUrl: momentum.sourceUrl,
        observationDate: momentum.observationDate,
        updateFrequency: momentum.updateFrequency,
      },
    ],
  };
}

function buildLehmanTrigger(indicators: IndicatorValue[]): TriggerType {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const hy = byId.get("hy-oas");
  const creditItems = [hy, byId.get("ig-oas"), byId.get("baa-aaa")];
  const bankItems = [
    byId.get("ted-spread"),
    byId.get("fra-ois"),
    byId.get("discount-window"),
    byId.get("btfp"),
    byId.get("bank-deposit-outflow"),
  ];
  const creditSignal = worst(creditItems.map((item) => item?.signal ?? "unavailable"));
  const bankSignal = worst(bankItems.map((item) => item?.signal ?? "unavailable"));
  const hyRedLine = hy?.numericValue !== null && hy?.numericValue !== undefined
    ? hy.numericValue >= BUBBLE_TRIGGER_CONFIG.credit.hyOasWarningBp
    : false;
  const signal: Signal =
    hyRedLine && rank[bankSignal] >= 1
      ? "red"
      : rank[creditSignal] >= 1 || rank[bankSignal] >= 1
        ? "yellow"
        : creditSignal === "unavailable" && bankSignal === "unavailable"
          ? "unavailable"
          : "green";

  return {
    id: "lehman",
    title: "Lehman Type",
    japanese: "リーマン型（信用主導）",
    signal,
    status:
      signal === "red"
        ? "引き金作動の可能性"
        : signal === "yellow"
          ? "信用ストレス初期"
          : signal === "unavailable"
            ? "判定待ち"
            : "信用市場は無風",
    summary:
      signal === "red"
        ? "HY OASの注意線と銀行・短期資金ストレスが重なり、信用主導の点火に注意が必要です。"
        : signal === "yellow"
          ? "信用スプレッドまたは銀行資金調達の一部に注意信号があります。"
          : "信用市場と銀行資金調達の安全弁は概ね機能しています。",
    beginnerExplanation:
      "お金の貸し借りが詰まり、社債・銀行・短期資金市場を通じて金融システムへ波及する型です。",
    metrics: [
      indicatorMetric(hy, "400bp超=信用ストレス初期 / 800bp付近=システム全体ストレスの公的シナリオ水準"),
      indicatorMetric(byId.get("ig-oas"), "1.0%未満=緑 / 1.0〜1.5%=黄 / 1.5%以上=赤"),
      indicatorMetric(byId.get("baa-aaa"), "1.0%未満=緑 / 1.0〜2.0%=黄 / 2.0%以上=赤"),
      indicatorMetric(byId.get("ted-spread"), "0.30%未満=緑 / 0.30〜0.60%=黄 / 0.60%以上=赤"),
      indicatorMetric(byId.get("fra-ois"), "20bp未満=緑 / 20〜50bp=黄 / 50bp以上=赤"),
      indicatorMetric(byId.get("discount-window"), "低位安定=緑 / 10B超または増加=黄 / 50B超または急増=赤"),
      indicatorMetric(byId.get("bank-deposit-outflow"), "通常=緑 / 中小銀行から流出=黄 / 広範囲流出=赤"),
    ],
  };
}

export function buildBubbleTriggerModel(indicators: IndicatorValue[]): BubbleTriggerModel {
  const dotcom = buildDotcomTrigger(indicators);
  const lehman = buildLehmanTrigger(indicators);
  const conversionActive = dotcom.signal === "red" && rank[lehman.signal] >= 1;
  const dominant =
    rank[dotcom.signal] > rank[lehman.signal]
      ? "流動性主導リスクが優勢、信用は相対的に落ち着いています。"
      : rank[lehman.signal] > rank[dotcom.signal]
        ? "信用主導リスクが優勢です。安全弁の機能低下を重点監視します。"
        : dotcom.signal === "green" && lehman.signal === "green"
          ? "2つの引き金はどちらも静穏です。"
          : "流動性主導と信用主導が同程度に点灯しています。";

  return {
    dotcom,
    lehman,
    dominant,
    conversionRisk: {
      active: conversionActive,
      signal: conversionActive ? "red" : dotcom.signal === "red" || lehman.signal === "red" ? "yellow" : "green",
      label: conversionActive
        ? "型の転化リスク"
        : "転化未確認",
      summary: conversionActive
        ? "流動性主導の悪化が信用主導へ波及する可能性があります。1929年型の分岐として最大級に監視します。"
        : "現時点では、流動性ショックが信用危機へ転化した状態は確認していません。",
    },
    boeThresholdNote: {
      label: `HY OAS ${BUBBLE_TRIGGER_CONFIG.credit.hyOasSystemicBp}bpはBank of England SWESの高ストレス想定と整合する参考線です。`,
      sourceName: BUBBLE_TRIGGER_CONFIG.credit.systemicThresholdSourceName,
      sourceUrl: BUBBLE_TRIGGER_CONFIG.credit.systemicThresholdSourceUrl,
    },
  };
}
