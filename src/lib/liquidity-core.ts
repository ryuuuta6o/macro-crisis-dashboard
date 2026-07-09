import type {
  IndicatorId,
  IndicatorValue,
  MarketNewsItem,
  Signal,
} from "@/types/indicator";

export type LiquidityCoreCategoryId =
  | "credit-market"
  | "short-term-funding"
  | "bank-liquidity"
  | "treasury-market"
  | "credit-supply";

export type LiquidityCoreCategory = {
  id: LiquidityCoreCategoryId;
  english: string;
  japanese: string;
  description: string;
  indicatorIds: IndicatorId[];
  unavailableLabels?: string[];
};

export type LiquidityCategorySummary = LiquidityCoreCategory & {
  signal: Signal;
  status: string;
  comment: string;
  indicators: IndicatorValue[];
  unavailableCount: number;
};

export const LIQUIDITY_CORE_CATEGORIES: LiquidityCoreCategory[] = [
  {
    id: "credit-market",
    english: "CREDIT MARKET",
    japanese: "信用市場",
    description: "企業がお金を借りる時のストレスを見る。",
    indicatorIds: ["hy-oas", "ig-oas", "baa-aaa", "ccc-oas"],
  },
  {
    id: "short-term-funding",
    english: "SHORT-TERM FUNDING",
    japanese: "短期金融市場",
    description: "銀行や金融機関同士のお金の流れを見る。",
    indicatorIds: ["sofr", "fra-ois", "ted-spread"],
    unavailableLabels: ["Repo Stress（SOFRで代替監視）"],
  },
  {
    id: "bank-liquidity",
    english: "BANK LIQUIDITY",
    japanese: "銀行流動性",
    description: "銀行からお金が逃げていないか、銀行に余力があるかを見る。",
    indicatorIds: [
      "bank-deposit-outflow",
      "mmf-assets",
      "discount-window",
      "btfp",
      "bank-cet1",
    ],
  },
  {
    id: "treasury-market",
    english: "TREASURY MARKET",
    japanese: "国債市場",
    description: "米国債市場が正常に機能しているかを見る。",
    indicatorIds: ["dgs10", "dgs30", "treasury-auction", "move"],
  },
  {
    id: "credit-supply",
    english: "CREDIT SUPPLY",
    japanese: "信用供給",
    description: "銀行や市場がお金を貸し続けているかを見る。",
    indicatorIds: ["sloos", "leveraged-loan-default"],
    unavailableLabels: ["Corporate Bankruptcy Filings"],
  },
];

const signalRank: Record<Signal, number> = {
  unavailable: -1,
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

function categorySignal(items: IndicatorValue[]): Signal {
  const available = items.filter((item) => item.signal !== "unavailable");
  if (available.length === 0) return "unavailable";
  if (available.filter((item) => item.signal === "red").length >= 2) {
    return "red";
  }
  if (
    available.some((item) => item.signal === "red") ||
    available.some((item) => item.signal === "orange")
  ) {
    return "orange";
  }
  if (available.filter((item) => item.signal === "yellow").length >= 2) {
    return "yellow";
  }
  return available.some((item) => item.signal === "yellow")
    ? "yellow"
    : "green";
}

function categoryComment(
  id: LiquidityCoreCategoryId,
  signal: Signal,
): string {
  const normal = {
    "credit-market": "企業の資金調達ストレスはまだ限定的です",
    "short-term-funding": "短期資金市場の詰まりはまだ確認されていません",
    "bank-liquidity": "預金と銀行の緊急資金調達は落ち着いています",
    "treasury-market": "米国債市場の機能は概ね維持されています",
    "credit-supply": "銀行と市場は信用供給を維持しています",
  }[id];
  const caution = {
    "credit-market": "一部の企業で資金調達コストが上がっています",
    "short-term-funding": "銀行間・短期資金市場の変化に注意が必要です",
    "bank-liquidity": "預金移動や安全資産への逃避に注意が必要です",
    "treasury-market": "長期金利と国債入札需要に注意が必要です",
    "credit-supply":
      "銀行の貸出姿勢が引き締まると、実体経済へ波及しやすくなります",
  }[id];
  const stressed = {
    "credit-market": "企業の借り換え環境に明確なストレスが出ています",
    "short-term-funding": "短期資金市場で強い詰まりが確認されています",
    "bank-liquidity": "銀行の資金流出または緊急調達への依存が強まっています",
    "treasury-market": "米国債市場の機能低下に注意が必要です",
    "credit-supply": "信用供給の収縮が実体経済へ波及する可能性があります",
  }[id];

  if (signal === "unavailable") return "取得済みデータが不足しています";
  if (signal === "red") return stressed;
  if (signal === "orange") return stressed;
  if (signal === "yellow") return caution;
  return normal;
}

export function getLiquidityCoreSummaries(
  indicators: IndicatorValue[],
): LiquidityCategorySummary[] {
  const byId = new Map(indicators.map((item) => [item.id, item]));

  return LIQUIDITY_CORE_CATEGORIES.map((category) => {
    const items = category.indicatorIds.flatMap((id) => {
      const indicator = byId.get(id);
      return indicator ? [indicator] : [];
    });
    const signal = categorySignal(items);

    return {
      ...category,
      indicators: items,
      signal,
      status:
        signal === "red"
          ? "強い詰まり"
          : signal === "orange"
            ? "強い注意"
          : signal === "yellow"
            ? "注意"
            : signal === "green"
              ? "正常"
              : "判定待ち",
      comment: categoryComment(category.id, signal),
      unavailableCount:
        items.filter((item) => item.signal === "unavailable").length +
        (category.unavailableLabels?.length ?? 0),
    };
  });
}

export function getLiquidityCoreState(
  summaries: LiquidityCategorySummary[],
) {
  const redCount = summaries.filter((item) => item.signal === "red").length;
  const orangeCount = summaries.filter(
    (item) => item.signal === "orange",
  ).length;
  const yellowCount = summaries.filter(
    (item) => item.signal === "yellow",
  ).length;
  const signal: Signal =
    redCount >= 2
      ? "red"
      : redCount >= 1 || orangeCount >= 1
        ? "orange"
        : yellowCount >= 2
          ? "yellow"
        : summaries.every((item) => item.signal === "unavailable")
          ? "unavailable"
          : "green";
  const attention = summaries
    .filter(
      (item) =>
        item.signal === "yellow" ||
        item.signal === "orange" ||
        item.signal === "red",
    )
    .map((item) => item.japanese);

  return {
    signal,
    status:
      signal === "red"
        ? "詰まりが強まっています"
        : signal === "orange"
          ? "強い注意"
          : signal === "yellow"
            ? "やや詰まり気味"
            : signal === "green"
              ? "概ね正常"
              : "判定待ち",
    comment:
      attention.length === 0
        ? "主要信用スプレッドは注意線未満で、お金の流れは概ね正常です。"
        : `主要信用スプレッドの注意線と、${attention.join("と")}を確認する必要があります。`,
  };
}

export function getWorseningLiquidityIndicators(
  summaries: LiquidityCategorySummary[],
): IndicatorValue[] {
  const unique = new Map<IndicatorId, IndicatorValue>();
  summaries.forEach((category) => {
    category.indicators.forEach((indicator) => {
      if (
        indicator.signal === "red" ||
        indicator.signal === "orange" ||
        indicator.signal === "yellow" ||
        signalRank[indicator.signal] > signalRank[indicator.previousSignal]
      ) {
        unique.set(indicator.id, indicator);
      }
    });
  });

  return [...unique.values()]
    .sort((left, right) => {
      const signalDelta = signalRank[right.signal] - signalRank[left.signal];
      if (signalDelta !== 0) return signalDelta;
      const leftChange =
        left.numericValue !== null && left.previousNumericValue !== null
          ? Math.abs(left.numericValue - left.previousNumericValue)
          : 0;
      const rightChange =
        right.numericValue !== null && right.previousNumericValue !== null
          ? Math.abs(right.numericValue - right.previousNumericValue)
          : 0;
      return rightChange - leftChange;
    })
    .slice(0, 6);
}

export function getRelatedNews(
  indicator: IndicatorValue,
  news: MarketNewsItem[],
) {
  const searchTerms = [
    indicator.name.toLowerCase(),
    indicator.shortName.toLowerCase(),
    ...indicator.fredSeries.map((item) => item.toLowerCase()),
  ];
  return news.filter((item) =>
    item.relatedIndicators.some((related) => {
      const normalized = related.toLowerCase();
      return searchTerms.some(
        (term) => normalized.includes(term) || term.includes(normalized),
      );
    }),
  );
}
