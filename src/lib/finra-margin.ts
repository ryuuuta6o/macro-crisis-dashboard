import * as cheerio from "cheerio";

const FINRA_MARGIN_URL =
  "https://www.finra.org/rules-guidance/key-topics/margin-accounts/margin-statistics";

export type FinraMarginObservation = {
  date: string;
  marginDebtMillionUsd: number;
};

const monthNumbers: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

function parseMonth(value: string) {
  const match = value.trim().match(/^([A-Z][a-z]{2})-(\d{2})$/);
  if (!match) return null;
  const month = monthNumbers[match[1]];
  if (!month) return null;
  const year = 2000 + Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function parseMillions(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseFinraMarginHtml(html: string): FinraMarginObservation[] {
  const $ = cheerio.load(html);
  const observations: FinraMarginObservation[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();
    if (cells.length < 2) return;
    const date = parseMonth(cells[0]);
    const marginDebtMillionUsd = parseMillions(cells[1]);
    if (date && marginDebtMillionUsd !== null) {
      observations.push({ date, marginDebtMillionUsd });
    }
  });

  const deduplicated = Array.from(
    new Map(observations.map((item) => [item.date, item])).values(),
  ).sort((left, right) => right.date.localeCompare(left.date));

  if (deduplicated.length < 2) {
    throw new Error("FINRA margin statistics table has insufficient observations");
  }
  return deduplicated;
}

export async function fetchFinraMarginHistory(): Promise<FinraMarginObservation[]> {
  const response = await fetch(FINRA_MARGIN_URL, {
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "text/html",
      "User-Agent": "MacroCrisisDashboard/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`FINRA margin statistics request failed: ${response.status}`);
  }
  return parseFinraMarginHtml(await response.text());
}

export const FINRA_MARGIN_SOURCE = {
  name: "FINRA Margin Statistics",
  url: FINRA_MARGIN_URL,
  updateFrequency: "FINRA月次公表後に自動取得（通常は翌月第3週）",
} as const;
