import { NextResponse } from "next/server";
import { getConfiguredHiddenGemsData } from "@/lib/hidden-gems-source";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const data = await getConfiguredHiddenGemsData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
