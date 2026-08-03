import { NextResponse } from "next/server";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";
import { buildWhaleMovements } from "@/lib/whale-movements";

export async function GET() {
  const investors = await getSmartMoneyInvestors();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    updateFrequency: "SEC提出確認・最大6時間キャッシュ",
    delayNote:
      "13Fは四半期末の保有を最大45日後に開示するため、リアルタイム売買ではありません。",
    sizeMethod:
      "開示株数差を四半期末の開示評価単価で換算。実際の売買代金ではありません。",
    movements: buildWhaleMovements(investors),
  });
}
