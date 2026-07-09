import { getLiveGlobalRiskData } from "@/lib/global-risk";

export const revalidate = 300;

export async function GET() {
  return Response.json(await getLiveGlobalRiskData(), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}
