import { readFile } from "node:fs/promises";
import path from "node:path";
import { getHiddenGemsData } from "@/lib/hidden-gems";
import type { HiddenGemsData } from "@/types/hidden-gems";

export async function getConfiguredHiddenGemsData(): Promise<HiddenGemsData> {
  const source = process.env.DATA_SOURCE?.toLowerCase() === "fmp" ? "fmp" : "free";
  if (source === "fmp") return getHiddenGemsData();
  return readFreeHiddenGemsSnapshot();
}

export async function readFreeHiddenGemsSnapshot(): Promise<HiddenGemsData> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "hidden-gems.json",
    );
    const parsed = JSON.parse(
      await readFile(filePath, "utf8"),
    ) as HiddenGemsData;
    if (
      !parsed ||
      !Array.isArray(parsed.items) ||
      !Array.isArray(parsed.history) ||
      typeof parsed.generatedAt !== "string"
    ) {
      throw new Error("Invalid Hidden Gems snapshot");
    }
    return { ...parsed, dataSource: "free" };
  } catch {
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
}
