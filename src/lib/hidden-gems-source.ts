import { readFile } from "node:fs/promises";
import path from "node:path";
import { getHiddenGemsData } from "@/lib/hidden-gems";
import type { HiddenGemsData } from "@/types/hidden-gems";

const DEFAULT_REMOTE_SNAPSHOT =
  "https://raw.githubusercontent.com/ryuuuta6o/macro-crisis-dashboard/main/public/data/hidden-gems.json";

export async function getConfiguredHiddenGemsData(): Promise<HiddenGemsData> {
  const source = process.env.DATA_SOURCE?.toLowerCase() === "fmp" ? "fmp" : "free";
  if (source === "fmp") return getHiddenGemsData();
  return readFreeHiddenGemsSnapshot();
}

export async function readFreeHiddenGemsSnapshot(): Promise<HiddenGemsData> {
  const [remote, local] = await Promise.all([
    readRemoteSnapshot(),
    readLocalSnapshot(),
  ]);
  if (remote && local) {
    return Date.parse(remote.generatedAt) > Date.parse(local.generatedAt)
      ? remote
      : local;
  }
  if (remote) return remote;
  if (local) return local;
  return {
      generatedAt: new Date(0).toISOString(),
      methodologyVersion: "hidden-gems-free-v1",
      dataSource: "free",
      status: "unavailable",
      items: [],
      evaluatedCompanies: 0,
      eligibleCompanies: 0,
      exclusions: {
        missingRequiredData: 0,
        lowRevenueGrowth: 0,
        unprofitable: 0,
        tooSmall: 0,
        alreadySurged: 0,
      },
      history: [],
      disclaimer:
        "これは状態の可視化であり、推奨ではありません。Gem Scoreは実態と注目の乖離であり、価格上昇の予測ではありません。",
      dataNote:
        "無料データスナップショットを読み込めませんでした。前回のGitHub Actions実行結果を確認してください。",
      records: [],
  };
}

async function readRemoteSnapshot(): Promise<HiddenGemsData | null> {
  try {
    const response = await fetch(
      process.env.HIDDEN_GEMS_REMOTE_URL ?? DEFAULT_REMOTE_SNAPSHOT,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return null;
    const parsed = (await response.json()) as HiddenGemsData;
    return isValidSnapshot(parsed) ? { ...parsed, dataSource: "free" } : null;
  } catch {
    return null;
  }
}

async function readLocalSnapshot(): Promise<HiddenGemsData | null> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "hidden-gems.json",
    );
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as HiddenGemsData;
    return isValidSnapshot(parsed) ? { ...parsed, dataSource: "free" } : null;
  } catch {
    return null;
  }
}

function isValidSnapshot(value: HiddenGemsData) {
  return Boolean(
    value &&
      Array.isArray(value.items) &&
      Array.isArray(value.history) &&
      typeof value.generatedAt === "string",
  );
}
