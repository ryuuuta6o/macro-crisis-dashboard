function hashSeed(value: string) {
  return [...value].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

export function createSparkline(
  seed: string,
  length = 18,
  trend = 0,
): number[] {
  let state = hashSeed(seed) || 1;
  let value = 48;

  return Array.from({ length }, (_, index) => {
    state = (state * 9301 + 49297) % 233280;
    const noise = state / 233280 - 0.5;
    value += noise * 8 + trend * 0.9 + Math.sin(index * 0.7) * 0.7;
    return Math.max(8, Math.min(92, value));
  });
}

export function sparklinePoints(values: number[], width = 120, height = 34) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export const riskTrendSeries = [
  { name: "Credit", color: "#22d3ee", values: createSparkline("credit", 30, 0.05) },
  { name: "Liquidity", color: "#8b5cf6", values: createSparkline("liquidity", 30, -0.03) },
  { name: "Rates", color: "#f59e0b", values: createSparkline("rates", 30, 0.12) },
  { name: "Volatility", color: "#ef4444", values: createSparkline("volatility", 30, 0.08) },
  { name: "CRE", color: "#f97316", values: createSparkline("cre", 30, 0.14) },
  { name: "Private Credit", color: "#ec4899", values: createSparkline("private", 30, 0.1) },
];
