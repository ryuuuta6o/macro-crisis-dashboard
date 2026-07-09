import { NextResponse } from "next/server";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";

export async function GET() {
  const investors = await getSmartMoneyInvestors();
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      delayNotice:
        "SEC Form 13F is a quarter-end disclosure filed up to 45 days later. It is not real-time trading data.",
      investors,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
