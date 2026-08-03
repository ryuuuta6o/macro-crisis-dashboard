import type {
  PositionChangeType,
  SmartMoneyInvestor,
  SmartMoneyPosition,
} from "@/types/smart-money";

export type WhaleMovementSize = "超大型" | "大型" | "中型" | "小型";

export type WhaleMovement = {
  id: string;
  investor: string;
  firm: string;
  period: string;
  filingDate: string;
  company: string;
  cusip: string;
  optionType: string | null;
  changeType: PositionChangeType;
  shareChange: number;
  changePercent: number | null;
  estimatedChangeValue: number;
  currentValue: number;
  size: WhaleMovementSize;
  sourceUrl: string;
};

const movementTypes = new Set<PositionChangeType>([
  "新規",
  "買い増し",
  "減少",
  "全売却",
]);

export function buildWhaleMovements(
  investors: SmartMoneyInvestor[],
  limit = 12,
): WhaleMovement[] {
  return investors
    .flatMap((investor) => {
      const sourceUrl = investor.sourceUrl;
      if (investor.dataStatus !== "live" || !sourceUrl) return [];
      return investor.positions.flatMap((position) => {
        if (!movementTypes.has(position.changeType)) return [];
        const estimatedChangeValue = estimatePositionChangeValue(position);
        if (estimatedChangeValue <= 0) return [];
        return [
          {
            id: [
              investor.slug,
              position.cusip,
              position.securityClass,
              position.optionType ?? "shares",
              investor.filingDate,
            ].join(":"),
            investor: investor.investor,
            firm: investor.firm,
            period: investor.period,
            filingDate: investor.filingDate,
            company: position.company,
            cusip: position.cusip,
            optionType: position.optionType,
            changeType: position.changeType,
            shareChange: position.currentShares - position.previousShares,
            changePercent: position.changePercent,
            estimatedChangeValue,
            currentValue: position.currentValue,
            size: classifyWhaleMovementSize(estimatedChangeValue),
            sourceUrl,
          },
        ];
      });
    })
    .sort(
      (left, right) =>
        right.filingDate.localeCompare(left.filingDate) ||
        right.estimatedChangeValue - left.estimatedChangeValue,
    )
    .slice(0, limit);
}

export function estimatePositionChangeValue(position: SmartMoneyPosition) {
  const shareChange = Math.abs(
    position.currentShares - position.previousShares,
  );
  if (shareChange === 0) return 0;

  const referenceValue =
    position.currentShares > 0 && position.currentValue > 0
      ? position.currentValue / position.currentShares
      : position.previousShares > 0 && position.previousValue > 0
        ? position.previousValue / position.previousShares
        : 0;
  return shareChange * referenceValue;
}

export function classifyWhaleMovementSize(
  estimatedValue: number,
): WhaleMovementSize {
  if (estimatedValue >= 1_000_000_000) return "超大型";
  if (estimatedValue >= 250_000_000) return "大型";
  if (estimatedValue >= 50_000_000) return "中型";
  return "小型";
}
