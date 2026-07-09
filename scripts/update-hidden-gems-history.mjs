import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.HIDDEN_GEMS_BASE_URL ?? "http://127.0.0.1:3001";
const response = await fetch(`${baseUrl}/api/sectors/hidden-gems`);

if (!response.ok) {
  throw new Error(`Hidden Gems API failed with status ${response.status}`);
}

const data = await response.json();
if (data.status !== "ready") {
  throw new Error("Hidden Gems data is unavailable. Snapshot was not written.");
}

const filePath = path.join(process.cwd(), "data", "hidden-gems-history.json");
const current = JSON.parse(await readFile(filePath, "utf8"));
const date = data.generatedAt.slice(0, 10);
const snapshot = {
  date,
  generatedAt: data.generatedAt,
  methodologyVersion: data.methodologyVersion,
  entries: data.items.map((item) => ({
    ticker: item.ticker,
    gemScore: item.gemScore,
    fundamentalScore: item.fundamentalScore,
    attentionScore: item.attentionScore,
    price: null,
  })),
};
const next = [
  ...current.filter((entry) => entry.date !== date),
  snapshot,
].slice(-365);

await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Saved Hidden Gems snapshot for ${date}: ${snapshot.entries.length} entries`);
