import { NextResponse } from "next/server";
import { getSectorMomentumData } from "@/lib/sector-momentum";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const data = await getSectorMomentumData();

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
