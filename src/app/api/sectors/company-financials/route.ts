import { NextRequest, NextResponse } from "next/server";
import {
  getAllFreeCompanyFinancials,
  getConfiguredCompanyFinancials,
} from "@/lib/free-company-financials";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("all") === "1") {
    if (process.env.DATA_SOURCE?.toLowerCase() === "fmp") {
      return NextResponse.json(
        { error: "Bulk financials are available in free mode only" },
        { status: 400 },
      );
    }
    return jsonResponse(await getAllFreeCompanyFinancials());
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  return jsonResponse(await getConfiguredCompanyFinancials(symbol));
}

function jsonResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control":
        "public, s-maxage=900, stale-while-revalidate=300",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=900, stale-while-revalidate=300",
    },
  });
}
