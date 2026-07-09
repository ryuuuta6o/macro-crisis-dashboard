import { unstable_cache } from "next/cache";
import filerData from "@/data/smart-money-investors.json";
import type {
  PositionChangeType,
  SmartMoneyFiler,
  SmartMoneyInvestor,
  SmartMoneyPosition,
  SmartMoneyStance,
} from "@/types/smart-money";

const filers = filerData as SmartMoneyFiler[];
const SEC_HEADERS = {
  "User-Agent":
    process.env.SEC_USER_AGENT ??
    "Macro Crisis Dashboard https://macro-crisis-dashboard.vercel.app",
  Accept: "application/json, application/xml, text/xml, */*",
};

type Filing = {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  primaryDocument: string;
};

type RawHolding = {
  key: string;
  company: string;
  securityClass: string;
  cusip: string;
  optionType: string | null;
  shareType: string;
  shares: number;
  value: number;
};

type SecSubmissions = {
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
    };
  };
};

type FilingIndex = {
  directory?: {
    item?: Array<{ name?: string; type?: string }>;
  };
};

export const getSmartMoneyInvestors = unstable_cache(
  async () => mapWithConcurrency(filers, 1, loadInvestor),
  ["sec-13f-investors-v5"],
  { revalidate: 21600, tags: ["sec-13f"] },
);

async function loadInvestor(filer: SmartMoneyFiler): Promise<SmartMoneyInvestor> {
  try {
    const filings = await getRecentFilings(filer.cik);
    if (filings.length < 2) {
      throw new Error("比較できる13F提出書類が2期分見つかりませんでした。");
    }

    const [latest, previous] = filings;
    const [latestHoldings, previousHoldings] = await Promise.all([
      getHoldings(filer.cik, latest),
      getHoldings(filer.cik, previous),
    ]);

    const sourceUrl = filingUrl(filer.cik, latest.accessionNumber);
    const positions = compareHoldings(
      latestHoldings,
      previousHoldings,
      sourceUrl,
    );
    const activePositions = positions.filter((item) => item.currentShares > 0);
    const totalValue = activePositions.reduce(
      (sum, item) => sum + item.currentValue,
      0,
    );
    const topIncreases = positions
      .filter((item) => item.changeType === "新規" || item.changeType === "買い増し")
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 3)
      .map((item) => item.company);
    const topDecreases = positions
      .filter((item) => item.changeType === "減少" || item.changeType === "全売却")
      .sort((a, b) => b.previousValue - a.previousValue)
      .slice(0, 3)
      .map((item) => item.company);
    const stance = classifyStance(positions);

    return {
      ...filer,
      period: formatQuarter(latest.reportDate),
      previousPeriod: formatQuarter(previous.reportDate),
      filingDate: latest.filingDate,
      dataStatus: "live",
      statusMessage: filer.disclosureNote ?? null,
      stance,
      topIncreases,
      topDecreases,
      summary: buildSummary(positions, activePositions),
      totalValue,
      positionCount: activePositions.length,
      sourceUrl,
      positions,
    };
  } catch (error) {
    return unavailableInvestor(filer, error);
  }
}

async function getRecentFilings(cik: string): Promise<Filing[]> {
  const paddedCik = cik.padStart(10, "0");
  const response = await secFetch(
    `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
  );
  const data = (await response.json()) as SecSubmissions;
  const recent = data.filings?.recent;
  if (!recent?.form) return [];

  const filings: Filing[] = [];
  const seenReports = new Set<string>();

  for (let index = 0; index < recent.form.length; index += 1) {
    if (recent.form[index] !== "13F-HR") continue;
    const reportDate = recent.reportDate?.[index];
    const accessionNumber = recent.accessionNumber?.[index];
    if (!reportDate || !accessionNumber || seenReports.has(reportDate)) continue;

    filings.push({
      reportDate,
      accessionNumber,
      filingDate: recent.filingDate?.[index] ?? "",
      primaryDocument: recent.primaryDocument?.[index] ?? "",
    });
    seenReports.add(reportDate);
    if (filings.length === 2) break;
  }

  return filings;
}

async function getHoldings(cik: string, filing: Filing): Promise<RawHolding[]> {
  const base = filingArchiveBase(cik, filing.accessionNumber);
  const response = await secFetch(`${base}/index.json`);
  const index = (await response.json()) as FilingIndex;
  const xmlNames = (index.directory?.item ?? [])
    .map((item) => item.name ?? "")
    .filter(
      (name) =>
        name.toLowerCase().endsWith(".xml") &&
        name !== filing.primaryDocument &&
        name.toLowerCase() !== "primary_doc.xml",
    );

  for (const name of xmlNames) {
    const xmlResponse = await secFetch(`${base}/${name}`);
    const xml = await xmlResponse.text();
    if (/<(?:\w+:)?infoTable\b/i.test(xml)) return parseInformationTable(xml);
  }

  throw new Error(`${filing.reportDate}の保有明細XMLが見つかりませんでした。`);
}

function parseInformationTable(xml: string): RawHolding[] {
  const holdings = new Map<string, RawHolding>();
  const blockPattern =
    /<(?:\w+:)?infoTable\b[^>]*>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi;

  for (const match of xml.matchAll(blockPattern)) {
    const block = match[1];
    const company = readTag(block, "nameOfIssuer");
    const securityClass = readTag(block, "titleOfClass");
    const cusip = readTag(block, "cusip");
    const optionType = readTag(block, "putCall") || null;
    const shareType = readTag(block, "sshPrnamtType") || "SH";
    const shares = parseNumber(readTag(block, "sshPrnamt"));
    const value = parseNumber(readTag(block, "value"));
    if (!company || !cusip) continue;

    const key = `${cusip}|${securityClass}|${optionType ?? ""}|${shareType}`;
    const existing = holdings.get(key);
    if (existing) {
      existing.shares += shares;
      existing.value += value;
    } else {
      holdings.set(key, {
        key,
        company,
        securityClass,
        cusip,
        optionType,
        shareType,
        shares,
        value,
      });
    }
  }

  const parsed = [...holdings.values()];
  const perShareValues = parsed
    .filter((item) => item.shares > 0 && item.value > 0)
    .map((item) => item.value / item.shares)
    .sort((a, b) => a - b);
  const medianPerShare =
    perShareValues[Math.floor(perShareValues.length / 2)] ?? 0;

  // Some valid 13F XML filings still report value in legacy $1,000 units.
  if (medianPerShare > 0 && medianPerShare < 1) {
    return parsed.map((item) => ({ ...item, value: item.value * 1000 }));
  }

  return parsed;
}

function compareHoldings(
  currentItems: RawHolding[],
  previousItems: RawHolding[],
  sourceUrl: string,
): SmartMoneyPosition[] {
  const current = new Map(currentItems.map((item) => [item.key, item]));
  const previous = new Map(previousItems.map((item) => [item.key, item]));
  const keys = new Set([...current.keys(), ...previous.keys()]);
  const totalValue = currentItems.reduce((sum, item) => sum + item.value, 0);

  return [...keys]
    .map((key): SmartMoneyPosition => {
      const currentItem = current.get(key);
      const previousItem = previous.get(key);
      const currentShares = currentItem?.shares ?? 0;
      const previousShares = previousItem?.shares ?? 0;
      const changePercent =
        previousShares === 0
          ? null
          : ((currentShares - previousShares) / previousShares) * 100;
      const changeType = getChangeType(
        previousShares,
        currentShares,
        changePercent,
      );
      const item = currentItem ?? previousItem!;

      return {
        ticker: null,
        cusip: item.cusip,
        company: item.company,
        securityClass: item.securityClass,
        optionType: item.optionType,
        shareType: item.shareType,
        previousShares,
        currentShares,
        previousValue: previousItem?.value ?? 0,
        currentValue: currentItem?.value ?? 0,
        changePercent,
        changeType,
        portfolioWeight:
          totalValue > 0 ? ((currentItem?.value ?? 0) / totalValue) * 100 : 0,
        source: "SEC Form 13F",
        sourceUrl,
        note: buildPositionNote(changeType, changePercent),
      };
    })
    .sort((a, b) => {
      if (a.currentValue === 0 && b.currentValue > 0) return 1;
      if (b.currentValue === 0 && a.currentValue > 0) return -1;
      return b.currentValue - a.currentValue || b.previousValue - a.previousValue;
    });
}

function getChangeType(
  previousShares: number,
  currentShares: number,
  changePercent: number | null,
): PositionChangeType {
  if (previousShares === 0 && currentShares > 0) return "新規";
  if (previousShares > 0 && currentShares === 0) return "全売却";
  if (changePercent === null || Math.abs(changePercent) < 0.01) return "継続";
  if (changePercent >= 1) return "買い増し";
  if (changePercent <= -1) return "減少";
  return "小幅変更";
}

function classifyStance(positions: SmartMoneyPosition[]): SmartMoneyStance {
  const increased = positions
    .filter((item) => item.changeType === "新規" || item.changeType === "買い増し")
    .reduce((sum, item) => sum + item.currentValue, 0);
  const decreased = positions
    .filter((item) => item.changeType === "減少" || item.changeType === "全売却")
    .reduce((sum, item) => sum + Math.max(item.previousValue, item.currentValue), 0);

  if (increased > decreased * 1.25) return "攻め";
  if (decreased > increased * 1.25) return "守り";
  return "中立";
}

function buildSummary(
  positions: SmartMoneyPosition[],
  activePositions: SmartMoneyPosition[],
) {
  const counts = countChanges(positions);
  const largest = activePositions[0]?.company;
  return `前四半期比で新規${counts.新規}件、買い増し${counts.買い増し}件、減少${counts.減少}件、全売却${counts.全売却}件です。${
    largest ? `13F上の最大保有は${largest}です。` : ""
  }これは四半期末時点の開示比較で、現在の売買判断を示すものではありません。`;
}

function countChanges(positions: SmartMoneyPosition[]) {
  const initial: Record<PositionChangeType, number> = {
    新規: 0,
    買い増し: 0,
    継続: 0,
    小幅変更: 0,
    減少: 0,
    全売却: 0,
  };
  return positions.reduce((counts, item) => {
    counts[item.changeType] += 1;
    return counts;
  }, initial);
}

function buildPositionNote(
  changeType: PositionChangeType,
  changePercent: number | null,
) {
  if (changeType === "新規")
    return "前回の13Fにはなく、今回の四半期末開示に現れた保有です。";
  if (changeType === "全売却")
    return "前回は開示されていましたが、今回の四半期末開示にはありません。";
  if (changeType === "継続")
    return "開示株数は前四半期末と同じです。";
  if (changeType === "小幅変更")
    return "開示株数の変化は1%未満です。";
  return `開示株数が前四半期末から${Math.abs(changePercent ?? 0).toFixed(
    1,
  )}%${changeType === "買い増し" ? "増えました" : "減りました"}。`;
}

function unavailableInvestor(
  filer: SmartMoneyFiler,
  error: unknown,
): SmartMoneyInvestor {
  return {
    ...filer,
    period: "取得できませんでした",
    previousPeriod: "",
    filingDate: "",
    dataStatus: "unavailable",
    statusMessage:
      error instanceof Error
        ? error.message
        : "SECデータの取得中にエラーが発生しました。",
    stance: "判断保留",
    topIncreases: [],
    topDecreases: [],
    summary:
      "一時的にSECの公開データを取得できません。時間を置いて再度確認してください。",
    totalValue: 0,
    positionCount: 0,
    sourceUrl: null,
    positions: [],
  };
}

let secRequestQueue = Promise.resolve();

async function secFetch(url: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForSecTurn();
    const response = await fetch(url, {
      headers: SEC_HEADERS,
      next: { revalidate: 21600 },
    });
    if (response.ok) return response;

    if (response.status !== 429 || attempt === 3) {
      throw new Error(`SEC API returned ${response.status}`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1200 * 2 ** attempt);
  }
  throw new Error("SEC API retry limit exceeded");
}

async function waitForSecTurn() {
  const turn = secRequestQueue.then(() => delay(220));
  secRequestQueue = turn.catch(() => undefined);
  await turn;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function filingArchiveBase(cik: string, accessionNumber: string) {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replaceAll("-", "")}`;
}

function filingUrl(cik: string, accessionNumber: string) {
  return `${filingArchiveBase(cik, accessionNumber)}/${accessionNumber}-index.html`;
}

function readTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(
      `<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
      "i",
    ),
  );
  return decodeXml(match?.[1]?.trim() ?? "");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function parseNumber(value: string) {
  const number = Number(value.replaceAll(",", ""));
  return Number.isFinite(number) ? number : 0;
}

function formatQuarter(date: string) {
  const [year, month] = date.split("-").map(Number);
  const quarter = Math.ceil(month / 3);
  return `${year} Q${quarter}（${date}時点）`;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}
