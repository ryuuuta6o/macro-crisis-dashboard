import * as cheerio from "cheerio";

import type { ManualIndicator, Signal } from "@/types/indicator";

const FDIC_QBP_URL = "https://www.fdic.gov/quarterly-banking-profile";

type DifObservation = {
  date: string;
  value: number;
  sourceUrl: string;
  sourceLabel: string;
};

function absoluteFdicUrl(value: string) {
  return new URL(value, FDIC_QBP_URL).toString();
}

function quarterEndFromText(value: string) {
  const compactMatch = value.match(/\b(20\d{2})\s+Q([1-4])\b/i);
  if (compactMatch) {
    const month = Number(compactMatch[2]) * 3;
    const day = new Date(Date.UTC(Number(compactMatch[1]), month, 0)).getUTCDate();
    return `${compactMatch[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const match = value.match(
    /\b(first|second|third|fourth|q([1-4]))\s+quarter\s+(20\d{2})\b/i,
  );
  if (!match) return null;
  const quarter = match[2]
    ? Number(match[2])
    : { first: 1, second: 2, third: 3, fourth: 4 }[
        match[1].toLowerCase() as "first" | "second" | "third" | "fourth"
      ];
  const month = quarter * 3;
  const day = new Date(Date.UTC(Number(match[3]), month, 0)).getUTCDate();
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDifStatement(
  html: string,
  sourceUrl: string,
): DifObservation | null {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const difTable = $("table")
    .filter((_, table) => /DIF Balance/i.test($(table).text()))
    .first();
  const latestCells = difTable
    .find("tr")
    .last()
    .find("th, td")
    .map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim())
    .get();
  const tableDate = quarterEndFromText(latestCells[0] ?? "");
  const tableValue = Number((latestCells.at(-1) ?? "").replace(/[$,]/g, ""));
  if (tableDate && Number.isFinite(tableValue) && tableValue > 0) {
    return {
      date: tableDate,
      value: tableValue,
      sourceUrl,
      sourceLabel: title,
    };
  }

  const date = quarterEndFromText(`${title} ${text.slice(0, 500)}`);
  if (!date) return null;

  const balanceSegment = text.match(
    /(?:balance of (?:the )?Deposit Insurance Fund\s*\(DIF\)|(?:Deposit Insurance Fund\s*\(DIF\)|DIF)\s+balance).{0,240}/i,
  )?.[0];
  if (!balanceSegment) return null;
  const balanceMatch = balanceSegment.match(
    /(?:was|to)\s+\$([\d,.]+)\s+billion/i,
  );
  const value = Number(balanceMatch?.[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;

  return {
    date,
    value,
    sourceUrl,
    sourceLabel: title,
  };
}

function signalForTrend(current: number, previous: number): Signal {
  const decline = (previous - current) / previous;
  if (decline <= 0.005) return "green";
  if (decline <= 0.05) return "yellow";
  return "red";
}

export async function fetchFdicDif(): Promise<ManualIndicator> {
  const indexResponse = await fetch(FDIC_QBP_URL, {
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "text/html",
      "User-Agent": "MacroCrisisDashboard/1.0",
    },
  });
  if (!indexResponse.ok) {
    throw new Error(`FDIC QBP request failed: ${indexResponse.status}`);
  }

  const $ = cheerio.load(await indexResponse.text());
  const statementUrls = Array.from(
    new Set(
      $("a")
        .map((_, element) => $(element).attr("href") ?? "")
        .get()
        .filter((href) =>
          /\/news\/speeches\/\d{4}\/fdic-quarterly-banking-profile-/i.test(
            href,
          ),
        )
        .map(absoluteFdicUrl),
    ),
  ).slice(0, 4);
  if (statementUrls.length < 2) {
    throw new Error("FDIC QBP statements could not be discovered");
  }

  const observations = (
    await Promise.all(
      statementUrls.map(async (url) => {
        const response = await fetch(url, {
          next: { revalidate: 21_600 },
          signal: AbortSignal.timeout(10_000),
          headers: {
            Accept: "text/html",
            "User-Agent": "MacroCrisisDashboard/1.0",
          },
        });
        if (!response.ok) return null;
        return parseDifStatement(await response.text(), url);
      }),
    )
  )
    .filter((item): item is DifObservation => item !== null)
    .sort((left, right) => right.date.localeCompare(left.date));

  if (observations.length < 2) {
    throw new Error("FDIC DIF history has insufficient observations");
  }
  const latest = observations[0];
  const previous = observations[1];
  const older = observations[2];

  return {
    value: latest.value,
    previousValue: previous.value,
    observationDate: latest.date,
    signal: signalForTrend(latest.value, previous.value),
    previousSignal: older
      ? signalForTrend(previous.value, older.value)
      : signalForTrend(latest.value, previous.value),
    sourceLabel: latest.sourceLabel,
    sourceName: "FDIC Quarterly Banking Profile",
    sourceUrl: latest.sourceUrl,
    updateFrequency: "FDIC四半期公表後に公式声明を自動確認",
    history: observations.map((item) => ({
      date: item.date,
      value: item.value,
    })),
  };
}
