import { NextResponse } from "next/server";
import { getAutomatedConditions } from "@/lib/free-macro-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getAutomatedConditions();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
