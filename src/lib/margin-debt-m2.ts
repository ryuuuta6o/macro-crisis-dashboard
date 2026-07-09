import { MARGIN_DEBT_M2_CONFIG } from "@/config/manual-data";
import type { IndicatorHistoryPoint, ManualIndicator, Signal } from "@/types/indicator";
import type { NumericObservation } from "@/lib/fred";

type MarginDebtPoint = {
  date: string;
  marginDebtMillionUsd: number;
};

export type MarginDebtM2Point = IndicatorHistoryPoint & {
  marginDebtMillionUsd: number;
  m2BillionUsd: number;
};

export type MarginDebtM2Peakout = {
  detected: boolean;
  label: string;
  note: string;
  latestValue: number | null;
  previousHighValue: number | null;
  previousHighDate: string | null;
  dropFromHighPctPoint: number | null;
};

function toMonth(date: string) {
  return date.slice(0, 7);
}

function findM2ForMarginMonth(
  point: MarginDebtPoint,
  m2Observations: NumericObservation[],
) {
  const pointTime = new Date(`${point.date}T00:00:00Z`).getTime();
  const exact = m2Observations.find((item) => toMonth(item.date) === toMonth(point.date));
  if (exact) return exact;

  return [...m2Observations]
    .sort((left, right) => right.date.localeCompare(left.date))
    .find((item) => new Date(`${item.date}T00:00:00Z`).getTime() <= pointTime);
}

export function buildMarginDebtM2History(
  m2Observations: NumericObservation[],
): MarginDebtM2Point[] {
  return MARGIN_DEBT_M2_CONFIG.marginDebtHistory.flatMap((point) => {
    const m2 = findM2ForMarginMonth(point, m2Observations);
    if (!m2) return [];
    const ratio = (point.marginDebtMillionUsd / (m2.value * 1_000)) * 100;
    return [
      {
        date: point.date,
        value: ratio,
        marginDebtMillionUsd: point.marginDebtMillionUsd,
        m2BillionUsd: m2.value,
      },
    ];
  });
}

export function signalForMarginDebtM2(value: number): Signal {
  if (value > 5.7) return "red";
  if (value >= 4.5) return "yellow";
  return "green";
}

export function detectMarginDebtM2Peakout(
  history: IndicatorHistoryPoint[],
): MarginDebtM2Peakout {
  if (history.length < 4) {
    return {
      detected: false,
      label: "判定待ち",
      note: "ピークアウト判定には少なくとも4カ月分の履歴が必要です。",
      latestValue: history[0]?.value ?? null,
      previousHighValue: null,
      previousHighDate: null,
      dropFromHighPctPoint: null,
    };
  }

  const latest = history[0];
  const previousThreeMonths = history.slice(1, 4);
  const previousHigh = previousThreeMonths.reduce((highest, point) =>
    point.value > highest.value ? point : highest,
  );
  const drop = previousHigh.value - latest.value;
  const detected =
    previousHigh.value >= MARGIN_DEBT_M2_CONFIG.lehmanPeakPct &&
    latest.value < history[1].value &&
    drop >= MARGIN_DEBT_M2_CONFIG.peakoutMinimumDropPctPoint;

  return {
    detected,
    label: detected
      ? "レバレッジ縮小開始 = 巻き戻しの予兆"
      : "燃料蓄積中（高水準だが反転せず）",
    note: detected
      ? "直近値が過去3カ月高値から明確に低下し、信用買いの巻き戻しが始まった可能性があります。"
      : "比率は高水準ですが、過去3カ月高値からの明確な下落転換はまだ検出していません。",
    latestValue: latest.value,
    previousHighValue: previousHigh.value,
    previousHighDate: previousHigh.date,
    dropFromHighPctPoint: drop,
  };
}

export function buildMarginDebtM2IndicatorData(
  m2Observations: NumericObservation[],
): { data: ManualIndicator; signal: Signal; previousSignal: Signal } {
  const history = buildMarginDebtM2History(m2Observations);
  if (history.length < 2) {
    throw new Error("Margin Debt / M2 has insufficient aligned history");
  }

  return {
    data: {
      value: history[0].value,
      previousValue: history[1].value,
      observationDate: history[0].date,
      history: history.slice(0, 12),
      sourceLabel: `${MARGIN_DEBT_M2_CONFIG.sourceName} / FRED ${MARGIN_DEBT_M2_CONFIG.m2SeriesId}`,
      sourceName: MARGIN_DEBT_M2_CONFIG.sourceName,
      sourceUrl: MARGIN_DEBT_M2_CONFIG.sourceUrl,
      updateFrequency: MARGIN_DEBT_M2_CONFIG.updateFrequency,
    },
    signal: signalForMarginDebtM2(history[0].value),
    previousSignal: signalForMarginDebtM2(history[1].value),
  };
}
